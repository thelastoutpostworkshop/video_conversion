import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export interface VideoTranscodeOptions {
  width?: number;
  height?: number;
  orientation?: VideoOrientation;
  scaleMode?: VideoScaleMode;
  fps?: number;
  quality?: number;
  durationSeconds?: number;
  startSeconds?: number;
  endSeconds?: number;
}

export interface AudioTranscodeOptions {
  bitrateKbps?: number;
  sampleRate?: number;
  channels?: number;
}

export interface MediaProcessingResult {
  data: Uint8Array;
  outputName: string;
}

export interface VideoMetadataResult {
  width: number;
  height: number;
  durationSeconds: number | null;
}

export type VideoOrientation = "none" | "cw90" | "ccw90" | "flip180";
export type VideoScaleMode = "fit" | "fill" | "stretch";
export type MediaProgressCallback = (percent: number) => void;
export type MediaLogCallback = (message: string) => void;

const tryBlobURL = async (url: string, mimeType: string) => {
  try {
    return await toBlobURL(url, mimeType);
  } catch (error) {
    console.warn("[app] ffmpeg optional asset missing", url, error);
    return null;
  }
};

const buildCoreUrls = async (baseUrl: string) => {
  const coreJs = `${baseUrl}ffmpeg-core.js`;
  const coreWasm = `${baseUrl}ffmpeg-core.wasm`;
  const coreWorker = `${baseUrl}ffmpeg-core.worker.js`;
  const coreURL = await toBlobURL(coreJs, "text/javascript");
  const wasmURL = await toBlobURL(coreWasm, "application/wasm");
  const workerURL = await tryBlobURL(coreWorker, "text/javascript");
  return workerURL ? { coreURL, wasmURL, workerURL } : { coreURL, wasmURL };
};

const resolveCoreUrls = async () => {
  const baseUrl = import.meta.env.BASE_URL ?? "/";
  const localBase =
    baseUrl.endsWith("/") ? `${baseUrl}ffmpeg/` : `${baseUrl}/ffmpeg/`;
  try {
    return await buildCoreUrls(localBase);
  } catch (error) {
    console.warn(
      "[app] ffmpeg core assets missing at",
      localBase,
      "run `npm run ffmpeg:assets` to regenerate them.",
      error
    );
    throw error;
  }
};

const buildVideoFilter = (options?: VideoTranscodeOptions): string | null => {
  const filters: string[] = [];
  const orientation = options?.orientation ?? "none";
  if (orientation === "cw90") {
    filters.push("transpose=1");
  } else if (orientation === "ccw90") {
    filters.push("transpose=2");
  } else if (orientation === "flip180") {
    filters.push("hflip", "vflip");
  }

  const width = options?.width ?? null;
  const height = options?.height ?? null;
  if (width && height) {
    const scaleMode = options?.scaleMode;
    if (scaleMode === "stretch") {
      filters.push(`scale=${width}:${height}`);
    } else if (scaleMode === "fill") {
      filters.push(
        `scale=${width}:${height}:force_original_aspect_ratio=increase:force_divisible_by=1,crop=${width}:${height}`
      );
    } else if (scaleMode === "fit") {
      filters.push(
        `scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=1,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`
      );
    } else {
      filters.push(`scale=${width}:${height}`);
    }
  }

  return filters.length > 0 ? filters.join(",") : null;
};

const parseDurationToSeconds = (line: string): number | null => {
  const match = line.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/i);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (![hours, minutes, seconds].every(Number.isFinite)) {
    return null;
  }
  return hours * 3600 + minutes * 60 + seconds;
};

const parseDurationFromLogs = (logs: string[]): number | null => {
  for (const line of logs) {
    const duration = parseDurationToSeconds(line);
    if (duration !== null) {
      return duration;
    }
  }
  return null;
};

const parseVideoResolution = (
  line: string
): { width: number; height: number } | null => {
  const match = line.match(/\b(\d{2,5})x(\d{2,5})\b/);
  if (!match) {
    return null;
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return { width, height };
};

const parseMetadataFromLogs = (logs: string[]): VideoMetadataResult | null => {
  let durationSeconds: number | null = null;
  let resolution: { width: number; height: number } | null = null;

  for (const line of logs) {
    if (durationSeconds === null) {
      durationSeconds = parseDurationToSeconds(line);
    }
    if (!resolution && /\bVideo:\b/i.test(line)) {
      resolution = parseVideoResolution(line);
    }
    if (resolution && durationSeconds !== null) {
      break;
    }
  }

  if (!resolution) {
    return null;
  }

  return {
    width: resolution.width,
    height: resolution.height,
    durationSeconds,
  };
};

const parsePngDimensions = (
  data: Uint8Array
): { width: number; height: number } | null => {
  if (data.length < 24) {
    return null;
  }
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < pngSignature.length; i += 1) {
    if (data[i] !== pngSignature[i]) {
      return null;
    }
  }
  const chunkType = String.fromCharCode(
    data[12] ?? 0,
    data[13] ?? 0,
    data[14] ?? 0,
    data[15] ?? 0
  );
  if (chunkType !== "IHDR") {
    return null;
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return { width, height };
};

const pickJobId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getFileExtension = (name: string): string | null => {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === name.length - 1) {
    return null;
  }
  return name.slice(dotIndex + 1).toLowerCase();
};

const describeUnknownError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "number") {
    return `FFmpeg exited with code ${error}.`;
  }
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return "Media conversion failed.";
};

const pickFailureLogLine = (logs: string[]): string | null => {
  const patterns = [
    /error/i,
    /failed/i,
    /invalid/i,
    /unsupported/i,
    /cannot/i,
    /no such/i,
    /not found/i,
  ];
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const line = logs[index] ?? "";
    if (patterns.some((pattern) => pattern.test(line))) {
      return line;
    }
  }
  return logs.length > 0 ? logs[logs.length - 1] ?? null : null;
};

interface RunTranscodeOptions {
  preInputArgs?: string[];
  expectedDurationSeconds?: number | null;
}

const parseProgressClockToSeconds = (value: string): number | null => {
  const match = value.trim().match(/^(-)?(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/);
  if (!match || match[1]) {
    return null;
  }
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  const seconds = Number(match[4]);
  if (![hours, minutes, seconds].every(Number.isFinite)) {
    return null;
  }
  return hours * 3600 + minutes * 60 + seconds;
};

const parseProgressSecondsFromLog = (line: string): number | null => {
  const outTimeUsMatch = line.match(/\bout_time_us=(\d+)/);
  if (outTimeUsMatch) {
    const outTimeUs = Number(outTimeUsMatch[1]);
    if (Number.isFinite(outTimeUs) && outTimeUs >= 0) {
      return outTimeUs / 1_000_000;
    }
  }

  const outTimeMsMatch = line.match(/\bout_time_ms=(\d+)/);
  if (outTimeMsMatch) {
    const outTimeMs = Number(outTimeMsMatch[1]);
    if (Number.isFinite(outTimeMs) && outTimeMs >= 0) {
      // ffmpeg reports out_time_ms in microseconds.
      return outTimeMs / 1_000_000;
    }
  }

  const outTimeMatch = line.match(/\bout_time=(\d+:\d{2}:\d{2}(?:\.\d+)?)/);
  if (outTimeMatch) {
    const parsed = parseProgressClockToSeconds(outTimeMatch[1]);
    if (parsed !== null) {
      return parsed;
    }
  }

  const timeMatch = line.match(/\btime=([-\d:.]+)/);
  if (!timeMatch) {
    return null;
  }
  return parseProgressClockToSeconds(timeMatch[1]);
};

export class MediaProcessingService {
  private ffmpeg: FFmpeg | null = null;
  private loadingPromise: Promise<void> | null = null;

  async ensureReady(): Promise<void> {
    if (this.ffmpeg && (this.ffmpeg as { loaded?: boolean }).loaded) {
      return;
    }
    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }
    this.loadingPromise = (async () => {
      const coreUrls = await resolveCoreUrls();
      this.ffmpeg = new FFmpeg();
      await this.ffmpeg.load(coreUrls);
    })();
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async runTranscode(
    file: File,
    outputExt: string,
    args: string[],
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal,
    options: RunTranscodeOptions = {}
  ): Promise<MediaProcessingResult> {
    await this.ensureReady();
    if (!this.ffmpeg) {
      throw new Error("FFmpeg failed to initialize.");
    }
    const ffmpeg = this.ffmpeg;

    const jobId = pickJobId();
    const inputExt = getFileExtension(file.name);
    const safeInputName = inputExt
      ? `${jobId}-input.${inputExt}`
      : `${jobId}-input.bin`;
    const outputName = `${jobId}-output.${outputExt}`;
    const recentLogLines: string[] = [];
    let progressDurationSeconds =
      typeof options.expectedDurationSeconds === "number" &&
      Number.isFinite(options.expectedDurationSeconds) &&
      options.expectedDurationSeconds > 0
        ? options.expectedDurationSeconds
        : null;
    let latestProgressPercent = 0;
    const inputExtension = getFileExtension(file.name);
    const forceMjpegInput =
      inputExtension === "mjpeg" || inputExtension === "mjpg";

    const emitProgress = (percent: number, allowComplete = false) => {
      if (!onProgress || !Number.isFinite(percent)) {
        return;
      }
      const maxPercent = allowComplete ? 100 : 99;
      const normalized = Math.max(0, Math.min(maxPercent, Math.round(percent)));
      if (normalized <= latestProgressPercent) {
        return;
      }
      latestProgressPercent = normalized;
      onProgress(normalized);
    };

    const handleProgress = (progress: { progress?: number }) => {
      if (!onProgress || typeof progress.progress !== "number") {
        return;
      }
      const percent = Math.max(0, Math.min(100, Math.round(progress.progress * 100)));
      emitProgress(percent, false);
    };
    const handleLog = (log: { message?: string; type?: string }) => {
      const line = log.message?.trim();
      if (line) {
        recentLogLines.push(line);
        if (recentLogLines.length > 80) {
          recentLogLines.shift();
        }
        if (progressDurationSeconds === null) {
          const parsedDuration = parseDurationToSeconds(line);
          if (
            typeof parsedDuration === "number" &&
            Number.isFinite(parsedDuration) &&
            parsedDuration > 0
          ) {
            progressDurationSeconds = parsedDuration;
          }
        }
        if (progressDurationSeconds !== null) {
          const progressSeconds = parseProgressSecondsFromLog(line);
          if (typeof progressSeconds === "number" && Number.isFinite(progressSeconds)) {
            const progressPercent = (progressSeconds / progressDurationSeconds) * 100;
            emitProgress(progressPercent, false);
          }
        }
      }
      if (!onLog) {
        return;
      }
      const label = log.type ? `[${log.type}] ` : "";
      const message = log.message ? `${label}${log.message}` : label.trim();
      if (message) {
        onLog(message);
      }
    };
    const offProgress = () => {
      try {
        const maybeOff = ffmpeg as { off?: Function };
        if (maybeOff.off) {
          maybeOff.off.call(ffmpeg, "progress", handleProgress);
          maybeOff.off.call(ffmpeg, "log", handleLog);
        }
      } catch (error) {
        console.debug("[app] ffmpeg off error", error);
      }
    };

    (ffmpeg as { on?: Function }).on?.("progress", handleProgress);
    (ffmpeg as { on?: Function }).on?.("log", handleLog);

    let abortHandler: (() => void) | null = null;
    let abortPromise: Promise<never> | null = null;
    if (signal) {
      abortPromise = new Promise((_, reject) => {
        abortHandler = () => {
          try {
            ffmpeg.terminate();
          } catch (terminateError) {
            console.debug("[app] ffmpeg terminate error", terminateError);
          } finally {
            this.ffmpeg = null;
          }
          reject(new Error("Conversion cancelled."));
        };
        if (signal.aborted) {
          abortHandler();
        } else {
          signal.addEventListener("abort", abortHandler, { once: true });
        }
      });
    }

    const race = async <T>(promise: Promise<T>): Promise<T> => {
      if (!abortPromise) {
        return promise;
      }
      return Promise.race([promise, abortPromise]);
    };

    try {
      const writeOptions = signal ? { signal } : undefined;
      await race(ffmpeg.writeFile(safeInputName, await fetchFile(file), writeOptions));
      const preInputArgs = options.preInputArgs ?? [];
      const inputArgs = forceMjpegInput
        ? ["-f", "mjpeg", "-i", safeInputName]
        : ["-i", safeInputName];
      const execArgs = ["-y", ...preInputArgs, ...inputArgs, ...args, outputName];
      if (onLog) {
        const displayInputArgs = forceMjpegInput
          ? ["-f", "mjpeg", "-i", file.name]
          : ["-i", file.name];
        const displayArgs = [
          "-y",
          ...preInputArgs,
          ...displayInputArgs,
          ...args,
          `output.${outputExt}`,
        ];
        onLog(`[app] exec ${displayArgs.join(" ")}`);
      }
      try {
        const exitCode = await race(ffmpeg.exec(execArgs, undefined, writeOptions));
        if (typeof exitCode === "number" && exitCode !== 0) {
          const failureLog = pickFailureLogLine(recentLogLines);
          if (failureLog) {
            throw new Error(`FFmpeg exited with code ${exitCode}. ${failureLog}`);
          }
          throw new Error(`FFmpeg exited with code ${exitCode}.`);
        }
        const data = await race(ffmpeg.readFile(outputName));
        const payload =
          typeof data === "string" ? new TextEncoder().encode(data) : data;
        const normalizedPayload =
          payload instanceof Uint8Array ? payload : new Uint8Array(payload);
        if (normalizedPayload.byteLength === 0) {
          const failureLog = pickFailureLogLine(recentLogLines);
          if (failureLog) {
            throw new Error(`FFmpeg produced an empty output file. ${failureLog}`);
          }
          throw new Error("FFmpeg produced an empty output file.");
        }
        emitProgress(100, true);
        return {
          data: normalizedPayload,
          outputName,
        };
      } catch (error) {
        const message = describeUnknownError(error);
        if (message.toLowerCase().includes("cancelled")) {
          throw error;
        }
        const failureLog = pickFailureLogLine(recentLogLines);
        if (failureLog && !message.includes(failureLog)) {
          throw new Error(`${message} ${failureLog}`);
        }
        throw new Error(message);
      }
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
      offProgress();
      const isLoaded = (ffmpeg as { loaded?: boolean }).loaded;
      if (isLoaded) {
        try {
          await ffmpeg.deleteFile(safeInputName);
        } catch (error) {
          console.debug("[app] media processing delete input failed", error);
        }
        try {
          await ffmpeg.deleteFile(outputName);
        } catch (error) {
          console.debug("[app] media processing delete output failed", error);
        }
      }
    }
  }

  async probeVideoMetadata(
    file: File,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<VideoMetadataResult> {
    await this.ensureReady();
    if (!this.ffmpeg) {
      throw new Error("FFmpeg failed to initialize.");
    }
    const ffmpeg = this.ffmpeg;

    const jobId = pickJobId();
    const safeInputName = `${jobId}-${file.name}`;
    const probeOutputName = `${jobId}-probe-frame.png`;
    const logs: string[] = [];
    const inputExtension = getFileExtension(file.name);
    const forceMjpegInput =
      inputExtension === "mjpeg" || inputExtension === "mjpg";

    const handleLog = (log: { message?: string; type?: string }) => {
      const message = log.message?.trim();
      if (!message) {
        return;
      }
      logs.push(message);
      if (!onLog) {
        return;
      }
      const label = log.type ? `[${log.type}] ` : "";
      onLog(`${label}${message}`);
    };

    (ffmpeg as { on?: Function }).on?.("log", handleLog);

    let abortHandler: (() => void) | null = null;
    let abortPromise: Promise<never> | null = null;
    if (signal) {
      abortPromise = new Promise((_, reject) => {
        abortHandler = () => {
          try {
            ffmpeg.terminate();
          } catch (terminateError) {
            console.debug("[app] ffmpeg terminate error", terminateError);
          } finally {
            this.ffmpeg = null;
          }
          reject(new Error("Metadata probe cancelled."));
        };
        if (signal.aborted) {
          abortHandler();
        } else {
          signal.addEventListener("abort", abortHandler, { once: true });
        }
      });
    }

    const race = async <T>(promise: Promise<T>): Promise<T> => {
      if (!abortPromise) {
        return promise;
      }
      return Promise.race([promise, abortPromise]);
    };

    try {
      const writeOptions = signal ? { signal } : undefined;
      await race(ffmpeg.writeFile(safeInputName, await fetchFile(file), writeOptions));
      const inputArgs = forceMjpegInput
        ? ["-f", "mjpeg", "-i", safeInputName]
        : ["-i", safeInputName];
      const probeArgs = [
        "-hide_banner",
        ...inputArgs,
        "-map",
        "0:v:0",
        "-frames:v",
        "1",
        "-f",
        "image2",
        "-update",
        "1",
        probeOutputName,
      ];
      if (onLog) {
        onLog(`[app] probe ${probeArgs.join(" ")}`);
      }

      await race(ffmpeg.exec(probeArgs, undefined, writeOptions));
      const rawFrameData = await race(ffmpeg.readFile(probeOutputName));
      const frameData =
        typeof rawFrameData === "string"
          ? new TextEncoder().encode(rawFrameData)
          : rawFrameData instanceof Uint8Array
            ? rawFrameData
            : new Uint8Array(rawFrameData);
      const dimensions = parsePngDimensions(frameData);
      if (!dimensions) {
        const parsed = parseMetadataFromLogs(logs);
        if (parsed) {
          return parsed;
        }
        throw new Error("Failed to parse metadata from FFmpeg output.");
      }
      return {
        width: dimensions.width,
        height: dimensions.height,
        durationSeconds: parseDurationFromLogs(logs),
      };
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
      try {
        const maybeOff = ffmpeg as { off?: Function };
        if (maybeOff.off) {
          maybeOff.off.call(ffmpeg, "log", handleLog);
        }
      } catch (error) {
        console.debug("[app] ffmpeg off error", error);
      }
      const isLoaded = (ffmpeg as { loaded?: boolean }).loaded;
      if (isLoaded) {
        try {
          await ffmpeg.deleteFile(safeInputName);
        } catch (error) {
          console.debug("[app] media processing delete probe input failed", error);
        }
        try {
          await ffmpeg.deleteFile(probeOutputName);
        } catch (error) {
          console.debug("[app] media processing delete probe output failed", error);
        }
      }
    }
  }

  async transcodeVideoToMjpeg(
    file: File,
    options?: VideoTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    const filter = buildVideoFilter(options);
    const args: string[] = ["-an", "-sn", "-dn", "-map", "0:v:0"];
    if (filter) {
      args.push("-vf", filter);
    }
    if (options?.fps) {
      args.push("-r", `${options.fps}`);
    }
    const startSeconds = options?.startSeconds ?? null;
    const endSeconds = options?.endSeconds ?? null;
    let durationSeconds = options?.durationSeconds ?? null;
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
    if (typeof startSeconds === "number" && startSeconds > 0) {
      args.push("-ss", `${startSeconds}`);
    }
    if (typeof durationSeconds === "number" && durationSeconds > 0) {
      args.push("-t", `${durationSeconds}`);
    }
    const quality = options?.quality ?? 3;
    args.push("-q:v", `${quality}`);
    return this.runTranscode(file, "mjpeg", args, onProgress, onLog, signal, {
      expectedDurationSeconds: durationSeconds,
    });
  }

  async transcodeVideoToGif(
    file: File,
    options?: VideoTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    const args: string[] = ["-an", "-sn", "-dn", "-map", "0:v:0"];
    const filterParts: string[] = [];
    if (options?.fps) {
      filterParts.push(`fps=${options.fps}`);
    }
    const scaleFilter = buildVideoFilter(options);
    if (scaleFilter) {
      filterParts.push(scaleFilter);
    }
    if (filterParts.length > 0) {
      args.push("-vf", filterParts.join(","));
    }

    const startSeconds = options?.startSeconds ?? null;
    const endSeconds = options?.endSeconds ?? null;
    let durationSeconds = options?.durationSeconds ?? null;
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
    if (typeof startSeconds === "number" && startSeconds > 0) {
      args.push("-ss", `${startSeconds}`);
    }
    if (typeof durationSeconds === "number" && durationSeconds > 0) {
      args.push("-t", `${durationSeconds}`);
    }

    args.push("-loop", "0");
    return this.runTranscode(file, "gif", args, onProgress, onLog, signal, {
      expectedDurationSeconds: durationSeconds,
    });
  }

  async transcodeVideoToAvi(
    file: File,
    options?: VideoTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    const filter = buildVideoFilter(options);
    const args: string[] = ["-an", "-sn", "-dn", "-map", "0:v:0"];
    if (filter) {
      args.push("-vf", filter);
    }
    if (options?.fps) {
      args.push("-r", `${options.fps}`);
    }
    const startSeconds = options?.startSeconds ?? null;
    const endSeconds = options?.endSeconds ?? null;
    let durationSeconds = options?.durationSeconds ?? null;
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
    if (typeof startSeconds === "number" && startSeconds > 0) {
      args.push("-ss", `${startSeconds}`);
    }
    if (typeof durationSeconds === "number" && durationSeconds > 0) {
      args.push("-t", `${durationSeconds}`);
    }
    const quality = options?.quality ?? 4;
    args.push("-c:v", "mjpeg", "-q:v", `${quality}`);
    return this.runTranscode(file, "avi", args, onProgress, onLog, signal, {
      expectedDurationSeconds: durationSeconds,
    });
  }

  async renderVideoFramePreview(
    file: File,
    options?: Pick<
      VideoTranscodeOptions,
      "width" | "height" | "orientation" | "scaleMode" | "startSeconds"
    >,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    const args: string[] = [];
    const preInputArgs: string[] = [];
    const startSeconds = options?.startSeconds ?? null;
    if (typeof startSeconds === "number" && startSeconds > 0) {
      // Fast seek for preview responsiveness on long videos.
      preInputArgs.push("-ss", `${startSeconds}`);
    }
    const filter = buildVideoFilter(options);
    if (filter) {
      args.push("-vf", filter);
    }
    args.push(
      "-an",
      "-sn",
      "-dn",
      "-map",
      "0:v:0",
      "-frames:v",
      "1",
      "-f",
      "image2",
      "-update",
      "1"
    );
    return this.runTranscode(file, "png", args, undefined, onLog, signal, {
      preInputArgs,
    });
  }

  async transcodeAudioToMp3(
    file: File,
    options?: AudioTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    const args: string[] = ["-vn"];
    const bitrate = options?.bitrateKbps ?? 128;
    args.push("-c:a", "libmp3lame", "-b:a", `${bitrate}k`);
    if (options?.sampleRate) {
      args.push("-ar", `${options.sampleRate}`);
    }
    if (options?.channels) {
      args.push("-ac", `${options.channels}`);
    }
    return this.runTranscode(file, "mp3", args, onProgress, onLog, signal);
  }

  async extractAudioFromVideo(
    file: File,
    options?: AudioTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    return this.transcodeAudioToMp3(file, options, onProgress, onLog, signal);
  }
}
