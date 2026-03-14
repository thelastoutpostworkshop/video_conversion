import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import {
  mediaCancelJobChannel,
  mediaCheckAvailabilityChannel,
  mediaJobEventChannel,
  mediaPickSavePathChannel,
  mediaPickSourceFileChannel,
  mediaRevealPathChannel,
  mediaRunJobChannel,
} from "./mediaChannels.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRootDir = path.resolve(__dirname, "..");
const activeJobs = new Map();
let handlersRegistered = false;
let resolvedNativeToolPathsPromise = null;

const mediaDialogMimeTypes = {
  ".avi": "video/x-msvideo",
  ".gif": "image/gif",
  ".mjpeg": "video/x-motion-jpeg",
  ".mjpg": "video/x-motion-jpeg",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const getFileExtension = (name) => {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex < 0 || dotIndex === name.length - 1
    ? null
    : name.slice(dotIndex + 1).toLowerCase();
};

const getMimeTypeForPath = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  return mediaDialogMimeTypes[extension] ?? "";
};

const getParentWindow = (webContents) => BrowserWindow.fromWebContents(webContents) ?? undefined;

const getBundledToolPlatformDir = () => {
  const relativeBundleDir = path.join("ffmpeg", `${process.platform}-${process.arch}`);
  return app.isPackaged
    ? path.join(process.resourcesPath, relativeBundleDir)
    : path.join(projectRootDir, "vendor", relativeBundleDir);
};

const bundledExecutableSuffix = process.platform === "win32" ? ".exe" : "";

const tryStatFile = async (candidatePath) => {
  try {
    const candidateStats = await stat(candidatePath);
    return candidateStats.isFile() ? candidatePath : null;
  } catch {
    return null;
  }
};

const resolveNativeToolPaths = async () => {
  if (resolvedNativeToolPathsPromise) {
    return resolvedNativeToolPathsPromise;
  }

  resolvedNativeToolPathsPromise = (async () => {
    const bundledToolDir = getBundledToolPlatformDir();
    const bundledFfmpegPath = await tryStatFile(
      path.join(bundledToolDir, `ffmpeg${bundledExecutableSuffix}`)
    );
    const bundledFfprobePath = await tryStatFile(
      path.join(bundledToolDir, `ffprobe${bundledExecutableSuffix}`)
    );
    const bundledFfplayPath = await tryStatFile(
      path.join(bundledToolDir, `ffplay${bundledExecutableSuffix}`)
    );

    if (bundledFfmpegPath && bundledFfprobePath) {
      return {
        source: "bundled",
        ffmpegPath: bundledFfmpegPath,
        ffprobePath: bundledFfprobePath,
        ffplayPath: bundledFfplayPath,
      };
    }

    if (app.isPackaged) {
      throw new Error(
        `Bundled FFmpeg tools are missing from ${bundledToolDir}. Rebuild the Electron app to repackage ffmpeg, ffprobe, and ffplay.`
      );
    }

    return {
      source: "path",
      ffmpegPath: "ffmpeg",
      ffprobePath: "ffprobe",
      ffplayPath: "ffplay",
    };
  })();

  try {
    return await resolvedNativeToolPathsPromise;
  } catch (error) {
    resolvedNativeToolPathsPromise = null;
    throw error;
  }
};

const isMjpegInput = (name) => {
  const extension = getFileExtension(name);
  return extension === "mjpeg" || extension === "mjpg";
};

const sendJobEvent = (webContents, jobId, payload) => {
  if (!webContents.isDestroyed()) {
    webContents.send(mediaJobEventChannel, { jobId, ...payload });
  }
};

const runCommand = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(stderr.trim() || stdout.trim() || `Exited with code ${code}.`));
    });
  });

const ensureNativeFfmpegAvailable = async () => {
  const toolPaths = await resolveNativeToolPaths();
  await runCommand(toolPaths.ffmpegPath, ["-version"]);
  await runCommand(toolPaths.ffprobePath, ["-version"]);
  if (toolPaths.ffplayPath) {
    await runCommand(toolPaths.ffplayPath, ["-version"]);
  }
};

const createTempWorkspace = async () =>
  mkdtemp(path.join(os.tmpdir(), "video-conversion-studio-"));

const moveFileWithFallback = async (sourcePath, targetPath) => {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await rm(targetPath, { force: true });
  try {
    await rename(sourcePath, targetPath);
  } catch {
    await copyFile(sourcePath, targetPath);
    await rm(sourcePath, { force: true });
  }
  return targetPath;
};

const writeSerializedInputFile = async (workspaceDir, file) => {
  if (typeof file.path === "string" && file.path.trim().length > 0) {
    return file.path;
  }
  if (!file.data) {
    throw new Error("Source media payload is missing.");
  }
  const extension = getFileExtension(file.name);
  const inputName = extension ? `input.${extension}` : "input.bin";
  const inputPath = path.join(workspaceDir, inputName);
  await writeFile(inputPath, Buffer.from(file.data));
  return inputPath;
};

const buildVideoFilter = (options = {}) => {
  const filters = [];
  const orientation = options.orientation ?? "none";
  if (orientation === "cw90") {
    filters.push("transpose=1");
  } else if (orientation === "ccw90") {
    filters.push("transpose=2");
  } else if (orientation === "flip180") {
    filters.push("hflip", "vflip");
  }

  const cropRegion = options.cropRegion;
  const hasCrop =
    typeof cropRegion?.width === "number" &&
    cropRegion.width > 0 &&
    typeof cropRegion?.height === "number" &&
    cropRegion.height > 0;
  if (hasCrop) {
    filters.push(
      `crop=${Math.max(1, Math.floor(cropRegion.width))}:${Math.max(
        1,
        Math.floor(cropRegion.height)
      )}:${Math.max(0, Math.floor(cropRegion.x ?? 0))}:${Math.max(
        0,
        Math.floor(cropRegion.y ?? 0)
      )}`
    );
  }

  const width = options.width ?? null;
  const height = options.height ?? null;
  if (width && height) {
    if (hasCrop) {
      filters.push(`scale=${width}:${height}`);
    } else if (options.scaleMode === "fill") {
      filters.push(
        `scale=${width}:${height}:force_original_aspect_ratio=increase:force_divisible_by=1,crop=${width}:${height}`
      );
    } else if (options.scaleMode === "fit") {
      filters.push(
        `scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=1,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`
      );
    } else {
      filters.push(`scale=${width}:${height}`);
    }
  }

  return filters.length > 0 ? filters.join(",") : null;
};

const resolveTrimWindowArgs = (options = {}) => {
  const startSeconds =
    typeof options.startSeconds === "number" ? options.startSeconds : null;
  const endSeconds =
    typeof options.endSeconds === "number" ? options.endSeconds : null;
  let durationSeconds =
    typeof options.durationSeconds === "number" ? options.durationSeconds : null;

  if (
    typeof startSeconds === "number" &&
    typeof endSeconds === "number" &&
    endSeconds > startSeconds
  ) {
    durationSeconds = endSeconds - startSeconds;
  } else if (
    typeof endSeconds === "number" &&
    (startSeconds === null || startSeconds <= 0)
  ) {
    durationSeconds = endSeconds;
  }

  const preInputArgs = [];
  const postInputArgs = [];
  if (typeof startSeconds === "number" && startSeconds > 0) {
    preInputArgs.push("-ss", `${startSeconds}`);
  }
  if (typeof durationSeconds === "number" && durationSeconds > 0) {
    postInputArgs.push("-t", `${durationSeconds}`);
  }
  return { preInputArgs, postInputArgs, durationSeconds };
};

const parseMetadataFromProbeOutput = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    const stream = Array.isArray(parsed.streams)
      ? parsed.streams.find(
          (candidate) =>
            Number.isFinite(Number(candidate?.width)) &&
            Number(candidate.width) > 0 &&
            Number.isFinite(Number(candidate?.height)) &&
            Number(candidate.height) > 0
        )
      : null;
    if (!stream) {
      return null;
    }
    return {
      width: Math.round(Number(stream.width)),
      height: Math.round(Number(stream.height)),
      durationSeconds:
        parsed.format?.duration !== undefined &&
        Number.isFinite(Number(parsed.format.duration)) &&
        Number(parsed.format.duration) >= 0
          ? Number(parsed.format.duration)
          : null,
    };
  } catch {
    return null;
  }
};

const runFfprobe = async (inputPath, fileName, webContents, jobId, emitLog = true) => {
  const toolPaths = await resolveNativeToolPaths();
  const probeArgs = [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:format=duration",
    "-of",
    "json",
    ...(isMjpegInput(fileName) ? ["-f", "mjpeg", inputPath] : [inputPath]),
  ];
  if (emitLog) {
    sendJobEvent(webContents, jobId, {
      type: "log",
      message: `[app] ffprobe ${probeArgs
        .map((segment) => (segment === inputPath ? fileName : segment))
        .join(" ")}`,
    });
  }
  const { stdout } = await runCommand(toolPaths.ffprobePath, probeArgs);
  const parsed = parseMetadataFromProbeOutput(stdout);
  if (!parsed) {
    throw new Error("Failed to parse metadata from FFprobe output.");
  }
  return parsed;
};

const parseClockSeconds = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const match = value.match(/(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
};

const buildProgressPayload = (state, expectedDurationSeconds) => {
  const timeSeconds =
    parseClockSeconds(state.out_time) ??
    (typeof state.out_time_us === "string" && Number.isFinite(Number(state.out_time_us))
      ? Number(state.out_time_us) / 1_000_000
      : null) ??
    (typeof state.out_time_ms === "string" && Number.isFinite(Number(state.out_time_ms))
      ? Number(state.out_time_ms) / 1_000_000
      : null);

  const normalizedSeconds =
    typeof timeSeconds === "number" && Number.isFinite(timeSeconds)
      ? Math.max(0, timeSeconds)
      : null;
  const percent =
    typeof expectedDurationSeconds === "number" &&
    expectedDurationSeconds > 0 &&
    normalizedSeconds !== null
      ? Math.max(
          0,
          Math.min(100, Math.round((normalizedSeconds / expectedDurationSeconds) * 100))
        )
      : state.progress === "end"
        ? 100
        : 0;

  return {
    percent,
    timeUs: normalizedSeconds === null ? null : Math.round(normalizedSeconds * 1_000_000),
    timeSeconds: normalizedSeconds,
  };
};

const pickFailureLogLine = (logs) => {
  const patterns = [/error/i, /failed/i, /invalid/i, /unsupported/i, /cannot/i];
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const line = logs[index] ?? "";
    if (patterns.some((pattern) => pattern.test(line))) {
      return line;
    }
  }
  return logs.at(-1) ?? null;
};

const buildJobDefinition = (action, options = {}) => {
  const trim = resolveTrimWindowArgs(options);
  if (action === "probeVideoMetadata") {
    return { kind: "probe" };
  }
  if (action === "transcodeVideoToMjpeg") {
    const args = ["-an", "-sn", "-dn", "-map", "0:v:0"];
    const filter = buildVideoFilter(options);
    if (filter) args.push("-vf", filter);
    if (options.fps) args.push("-r", `${options.fps}`);
    args.push(...trim.postInputArgs);
    args.push(
      "-c:v",
      "mjpeg",
      "-pix_fmt",
      "yuvj420p",
      "-color_range",
      "pc",
      "-q:v",
      `${options.quality ?? 3}`
    );
    return {
      kind: "ffmpeg",
      outputExt: "mjpeg",
      args,
      preInputArgs: trim.preInputArgs,
      suppressedLogPatterns: [
        /Incompatible pixel format 'yuv420p' for codec 'mjpeg'/i,
        /\bdeprecated pixel format used, make sure you did set range correctly\b/i,
      ],
    };
  }
  if (action === "transcodeVideoToGif") {
    const args = ["-an", "-sn", "-dn", "-map", "0:v:0"];
    const filterParts = [];
    if (options.fps) filterParts.push(`fps=${options.fps}`);
    const filter = buildVideoFilter(options);
    if (filter) filterParts.push(filter);
    if (filterParts.length > 0) args.push("-vf", filterParts.join(","));
    args.push(...trim.postInputArgs, "-loop", "0");
    return { kind: "ffmpeg", outputExt: "gif", args, preInputArgs: trim.preInputArgs, suppressedLogPatterns: [] };
  }
  if (action === "transcodeVideoToAvi") {
    const args = ["-an", "-sn", "-dn", "-map", "0:v:0"];
    const filter = buildVideoFilter(options);
    if (filter) args.push("-vf", filter);
    if (options.fps) args.push("-r", `${options.fps}`);
    args.push(...trim.postInputArgs, "-c:v", "mjpeg", "-q:v", `${options.quality ?? 4}`);
    return { kind: "ffmpeg", outputExt: "avi", args, preInputArgs: trim.preInputArgs, suppressedLogPatterns: [] };
  }
  if (action === "renderVideoFramePreview") {
    const preInputArgs =
      typeof options.startSeconds === "number" && options.startSeconds > 0
        ? ["-ss", `${options.startSeconds}`]
        : [];
    const args = ["-an", "-sn", "-dn", "-map", "0:v:0", "-frames:v", "1", "-f", "image2", "-update", "1"];
    const filter = buildVideoFilter(options);
    if (filter) args.unshift("-vf", filter);
    return { kind: "ffmpeg", outputExt: "png", args, preInputArgs, suppressedLogPatterns: [] };
  }
  if (action === "renderVideoMotionPreview") {
    const motionTrim = resolveTrimWindowArgs({
      startSeconds: options.startSeconds,
      durationSeconds: options.durationSeconds,
    });
    const previewFps =
      typeof options.fps === "number" && options.fps > 0
        ? Math.max(1, Math.min(15, Math.round(options.fps)))
        : 12;
    const filterParts = [`fps=${previewFps}`];
    const filter = buildVideoFilter(options);
    if (filter) filterParts.push(filter);
    const args = ["-an", "-sn", "-dn", "-map", "0:v:0", "-vf", filterParts.join(","), ...motionTrim.postInputArgs, "-loop", "0"];
    return { kind: "ffmpeg", outputExt: "gif", args, preInputArgs: motionTrim.preInputArgs, suppressedLogPatterns: [] };
  }
  if (action === "renderBrowserPlayableVideoProxy") {
    const previewFps =
      typeof options.fps === "number" && options.fps > 0
        ? Math.max(1, Math.min(15, Math.round(options.fps)))
        : 12;
    const maxWidth =
      typeof options.maxWidth === "number" && options.maxWidth > 0
        ? Math.max(64, Math.round(options.maxWidth))
        : 640;
    const maxHeight =
      typeof options.maxHeight === "number" && options.maxHeight > 0
        ? Math.max(64, Math.round(options.maxHeight))
        : 360;
    const args = [
      "-an",
      "-sn",
      "-dn",
      "-map",
      "0:v:0",
      "-vf",
      `fps=${previewFps},scale=${maxWidth}:${maxHeight}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
      "-c:v",
      "libvpx",
      "-crf",
      "34",
      "-b:v",
      "0",
      "-deadline",
      "realtime",
      "-cpu-used",
      "5",
      "-pix_fmt",
      "yuv420p",
    ];
    return { kind: "ffmpeg", outputExt: "webm", args, preInputArgs: trim.preInputArgs, suppressedLogPatterns: [] };
  }
  if (action === "transcodeAudioToMp3" || action === "extractAudioFromVideo") {
    const args = ["-vn", "-c:a", "libmp3lame", "-b:a", `${options.bitrateKbps ?? 128}k`];
    if (options.sampleRate) args.push("-ar", `${options.sampleRate}`);
    if (options.channels) args.push("-ac", `${options.channels}`);
    return { kind: "ffmpeg", outputExt: "mp3", args, preInputArgs: trim.preInputArgs, suppressedLogPatterns: [] };
  }
  throw new Error(`Unsupported media action: ${action}`);
};

const resolveExpectedDurationSeconds = async (job, inputPath, fileName, webContents) => {
  const trim = resolveTrimWindowArgs(job.options ?? {});
  if (typeof trim.durationSeconds === "number" && trim.durationSeconds > 0) {
    return trim.durationSeconds;
  }
  try {
    const metadata = await runFfprobe(inputPath, fileName, webContents, job.jobId, false);
    if (typeof metadata.durationSeconds === "number" && metadata.durationSeconds > 0) {
      const startSeconds =
        typeof job.options?.startSeconds === "number" && job.options.startSeconds > 0
          ? job.options.startSeconds
          : 0;
      return Math.max(0, metadata.durationSeconds - startSeconds);
    }
  } catch {}
  return null;
};

const runFfmpegJob = async (job, inputPath, fileName, outputPath, definition, webContents) => {
  const toolPaths = await resolveNativeToolPaths();
  const expectedDurationSeconds = await resolveExpectedDurationSeconds(
    job,
    inputPath,
    fileName,
    webContents
  );
  const inputArgs = isMjpegInput(fileName)
    ? ["-f", "mjpeg", "-i", inputPath]
    : ["-i", inputPath];
  const displayInputArgs = isMjpegInput(fileName)
    ? ["-f", "mjpeg", "-i", fileName]
    : ["-i", fileName];
  const execArgs = [
    "-y",
    "-progress",
    "pipe:1",
    "-nostats",
    ...definition.preInputArgs,
    ...inputArgs,
    ...definition.args,
    outputPath,
  ];
  sendJobEvent(webContents, job.jobId, {
    type: "log",
    message:
      toolPaths.source === "bundled"
        ? "[app] Using bundled FFmpeg CLI backend."
        : "[app] Using native FFmpeg CLI backend from PATH.",
  });
  sendJobEvent(webContents, job.jobId, {
    type: "log",
    message: `[app] exec ${[
      "-y",
      ...definition.preInputArgs,
      ...displayInputArgs,
      ...definition.args,
      `output.${definition.outputExt}`,
    ].join(" ")}`,
  });

  const child = spawn(toolPaths.ffmpegPath, execArgs, {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  activeJobs.set(job.jobId, { child, cancelled: false });

  let progressBuffer = "";
  let progressState = {};
  let stderrBuffer = "";
  const recentLogs = [];

  child.stdout.on("data", (chunk) => {
    progressBuffer += chunk.toString();
    let newlineIndex = progressBuffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = progressBuffer.slice(0, newlineIndex).trim();
      progressBuffer = progressBuffer.slice(newlineIndex + 1);
      if (line) {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex > 0) {
          progressState[line.slice(0, separatorIndex)] = line.slice(separatorIndex + 1);
          if (line.startsWith("progress=")) {
            sendJobEvent(webContents, job.jobId, {
              type: "progress",
              progress: buildProgressPayload(progressState, expectedDurationSeconds),
            });
            progressState = {};
          }
        }
      }
      newlineIndex = progressBuffer.indexOf("\n");
    }
  });

  child.stderr.on("data", (chunk) => {
    stderrBuffer += chunk.toString();
    const lines = stderrBuffer.split(/\r?\n/);
    stderrBuffer = lines.pop() ?? "";
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      recentLogs.push(line);
      if (recentLogs.length > 80) recentLogs.shift();
      const suppressed = definition.suppressedLogPatterns.some((pattern) => pattern.test(line));
      if (!suppressed) {
        sendJobEvent(webContents, job.jobId, { type: "log", message: `[stderr] ${line}` });
      }
    }
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  const jobState = activeJobs.get(job.jobId);
  activeJobs.delete(job.jobId);

  if (jobState?.cancelled) {
    throw new Error("Conversion cancelled.");
  }
  if (exitCode !== 0) {
    const failureLog = pickFailureLogLine(recentLogs);
    throw new Error(
      failureLog
        ? `FFmpeg exited with code ${exitCode}. ${failureLog}`
        : `FFmpeg exited with code ${exitCode}.`
    );
  }

  const outputStats = await stat(outputPath);
  if (outputStats.size <= 0) {
    const failureLog = pickFailureLogLine(recentLogs);
    throw new Error(
      failureLog
        ? `FFmpeg produced an empty output file. ${failureLog}`
        : "FFmpeg produced an empty output file."
    );
  }
  sendJobEvent(webContents, job.jobId, {
    type: "progress",
    progress: { percent: 100, timeUs: null, timeSeconds: null },
  });
  if (typeof job.options?.outputPath === "string" && job.options.outputPath.trim()) {
    const finalizedOutputPath = await moveFileWithFallback(outputPath, job.options.outputPath);
    return {
      data: new Uint8Array(),
      outputName: path.basename(finalizedOutputPath),
      savedPath: finalizedOutputPath,
    };
  }
  const data = new Uint8Array(await readFile(outputPath));
  return { data, outputName: path.basename(outputPath) };
};

const executeMediaJob = async (job, webContents) => {
  const workspaceDir = await createTempWorkspace();
  try {
    const inputPath = await writeSerializedInputFile(workspaceDir, job.file);
    const definition = buildJobDefinition(job.action, job.options ?? {});
    if (definition.kind === "probe") {
      return await runFfprobe(inputPath, job.file.name, webContents, job.jobId, true);
    }
    const outputPath = path.join(workspaceDir, `${randomUUID()}-output.${definition.outputExt}`);
    return await runFfmpegJob(
      job,
      inputPath,
      job.file.name,
      outputPath,
      definition,
      webContents
    );
  } finally {
    activeJobs.delete(job.jobId);
    await rm(workspaceDir, { recursive: true, force: true });
  }
};

const toSerializableError = (error) =>
  error instanceof Error
    ? { message: error.message, stack: error.stack }
    : { message: String(error) };

export const registerMediaIpcHandlers = () => {
  if (handlersRegistered) {
    return;
  }
  handlersRegistered = true;

  ipcMain.handle(mediaCheckAvailabilityChannel, async () => {
    try {
      await ensureNativeFfmpegAvailable();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? `Native ffmpeg/ffprobe is not available. ${error.message}`
            : "Native ffmpeg/ffprobe is not available.",
      };
    }
  });

  ipcMain.handle(mediaPickSourceFileChannel, async (event) => {
    const result = await dialog.showOpenDialog(getParentWindow(event.sender), {
      properties: ["openFile"],
      filters: [
        {
          name: "Media files",
          extensions: ["avi", "gif", "mjpeg", "mjpg", "mkv", "mov", "mp3", "mp4", "webm"],
        },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const selectedPath = result.filePaths[0];
    const fileStats = await stat(selectedPath);
    const payload = await readFile(selectedPath);
    return {
      canceled: false,
      file: {
        path: selectedPath,
        name: path.basename(selectedPath),
        type: getMimeTypeForPath(selectedPath),
        lastModified: fileStats.mtimeMs,
        data: new Uint8Array(payload),
      },
    };
  });

  ipcMain.handle(mediaPickSavePathChannel, async (event, request) => {
    const result = await dialog.showSaveDialog(getParentWindow(event.sender), {
      defaultPath: request.defaultPath,
      filters: Array.isArray(request.filters) ? request.filters : undefined,
    });
    return {
      canceled: result.canceled || !result.filePath,
      path: result.filePath ?? null,
    };
  });

  ipcMain.handle(mediaRevealPathChannel, async (_event, payload) => {
    if (typeof payload.path !== "string" || payload.path.trim().length === 0) {
      return { ok: false };
    }
    try {
      await stat(payload.path);
      shell.showItemInFolder(payload.path);
      return { ok: true };
    } catch {
      const fallbackDir = path.dirname(payload.path);
      await shell.openPath(fallbackDir);
      return { ok: true };
    }
  });

  ipcMain.handle(mediaRunJobChannel, async (event, request) => {
    try {
      await ensureNativeFfmpegAvailable();
      return await executeMediaJob(request, event.sender);
    } catch (error) {
      throw toSerializableError(error);
    }
  });

  ipcMain.handle(mediaCancelJobChannel, async (_event, payload) => {
    const jobState = activeJobs.get(payload.jobId);
    if (!jobState) {
      return { ok: false };
    }
    jobState.cancelled = true;
    try {
      jobState.child.kill();
    } catch (error) {
      throw toSerializableError(error);
    }
    return { ok: true };
  });
};
