import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export interface VideoTranscodeOptions {
  width?: number;
  height?: number;
  orientation?: VideoOrientation;
  scaleMode?: VideoScaleMode;
  cropRegion?: VideoCropRegion;
  fps?: number;
  quality?: number;
  durationSeconds?: number;
  startSeconds?: number;
  endSeconds?: number;
  outputPath?: string;
}

export interface AudioTranscodeOptions {
  bitrateKbps?: number;
  sampleRate?: number;
  channels?: number;
  startSeconds?: number;
  endSeconds?: number;
  outputPath?: string;
}

export interface MediaProcessingResult {
  data: Uint8Array;
  outputName: string;
  savedPath?: string;
}

export interface VideoMetadataResult {
  width: number;
  height: number;
  durationSeconds: number | null;
}

export type VideoOrientation = "none" | "cw90" | "ccw90" | "flip180";
export type VideoScaleMode = "fit" | "fill" | "stretch";
export interface VideoCropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  unit?: "pixels" | "normalized";
}
export interface MediaProgressInfo {
  percent: number;
  timeUs: number | null;
  timeSeconds: number | null;
}
export type MediaProgressCallback = (progress: MediaProgressInfo) => void;
export type MediaLogCallback = (message: string) => void;

const buildCoreUrls = async (baseUrl: string) => {
  const coreJs = `${baseUrl}ffmpeg-core.js`;
  const coreWasm = `${baseUrl}ffmpeg-core.wasm`;
  const coreURL = await toBlobURL(coreJs, "text/javascript");
  const wasmURL = await toBlobURL(coreWasm, "application/wasm");
  return { coreURL, wasmURL };
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

  const cropRegion = options?.cropRegion;
  const hasCustomCrop =
    typeof cropRegion?.width === "number" &&
    Number.isFinite(cropRegion.width) &&
    cropRegion.width > 0 &&
    typeof cropRegion?.height === "number" &&
    Number.isFinite(cropRegion.height) &&
    cropRegion.height > 0;
  if (hasCustomCrop) {
    if (cropRegion?.unit === "normalized") {
      const cropX = Math.max(0, Math.min(1, cropRegion.x ?? 0)).toFixed(6);
      const cropY = Math.max(0, Math.min(1, cropRegion.y ?? 0)).toFixed(6);
      const cropWidth = Math.max(0.02, Math.min(1, cropRegion.width ?? 1)).toFixed(6);
      const cropHeight = Math.max(0.02, Math.min(1, cropRegion.height ?? 1)).toFixed(6);
      filters.push(
        `crop=max(1\\,trunc(iw*${cropWidth})):max(1\\,trunc(ih*${cropHeight})):max(0\\,trunc(iw*${cropX})):max(0\\,trunc(ih*${cropY}))`
      );
    } else {
      const cropX = Math.max(0, Math.floor(cropRegion?.x ?? 0));
      const cropY = Math.max(0, Math.floor(cropRegion?.y ?? 0));
      const cropWidth = Math.max(1, Math.floor(cropRegion?.width ?? 1));
      const cropHeight = Math.max(1, Math.floor(cropRegion?.height ?? 1));
      filters.push(`crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`);
    }
  }

  const width = options?.width ?? null;
  const height = options?.height ?? null;
  if (width && height) {
    if (hasCustomCrop) {
      filters.push(`scale=${width}:${height}`);
    } else {
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
  }

  if (filters.length > 0) {
    filters.push("setsar=1");
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

const parsePositiveNumber = (rawValue: unknown): number | null => {
  const value =
    typeof rawValue === "number"
      ? rawValue
      : typeof rawValue === "string" && rawValue.trim()
        ? Number(rawValue)
        : NaN;
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
};

const parseDurationNumber = (rawValue: unknown): number | null => {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }
  const value =
    typeof rawValue === "number"
      ? rawValue
      : typeof rawValue === "string" && rawValue.trim()
        ? Number(rawValue)
        : NaN;
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
};

const parseFiniteNumber = (rawValue: unknown): number | null => {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }
  const value =
    typeof rawValue === "number"
      ? rawValue
      : typeof rawValue === "string" && rawValue.trim()
        ? Number(rawValue)
        : NaN;
  return Number.isFinite(value) ? value : null;
};

const shouldSwapDisplayDimensions = (rotationDegrees: number | null): boolean => {
  if (rotationDegrees === null) {
    return false;
  }
  const quarterTurns = ((Math.round(rotationDegrees / 90) % 4) + 4) % 4;
  return quarterTurns === 1 || quarterTurns === 3;
};

const parseRotationFromProbeStream = (stream: {
  tags?: { rotate?: unknown };
  side_data_list?: Array<{ rotation?: unknown }>;
}): number | null => {
  const sideDataList = Array.isArray(stream.side_data_list) ? stream.side_data_list : [];
  for (const sideData of sideDataList) {
    const rotation = parseFiniteNumber(sideData?.rotation);
    if (rotation !== null) {
      return rotation;
    }
  }
  return parseFiniteNumber(stream.tags?.rotate);
};

const parseMetadataFromFfprobeOutput = (
  rawOutput: string
): VideoMetadataResult | null => {
  if (!rawOutput.trim()) {
    return null;
  }

  try {
    const parsedUnknown = JSON.parse(rawOutput) as {
      streams?: Array<{
        width?: unknown;
        height?: unknown;
        tags?: { rotate?: unknown };
        side_data_list?: Array<{ rotation?: unknown }>;
      }>;
      format?: { duration?: unknown };
    };
    const streams = Array.isArray(parsedUnknown.streams)
      ? parsedUnknown.streams
      : [];
    const streamWithDimensions =
      streams.find((stream) => {
        const width = parsePositiveNumber(stream.width);
        const height = parsePositiveNumber(stream.height);
        return width !== null && height !== null;
      }) ?? null;

    if (!streamWithDimensions) {
      return null;
    }

    const width = parsePositiveNumber(streamWithDimensions.width);
    const height = parsePositiveNumber(streamWithDimensions.height);
    if (width === null || height === null) {
      return null;
    }
    const swapDimensions = shouldSwapDisplayDimensions(
      parseRotationFromProbeStream(streamWithDimensions)
    );
    const displayWidth = swapDimensions ? height : width;
    const displayHeight = swapDimensions ? width : height;

    return {
      width: Math.round(displayWidth),
      height: Math.round(displayHeight),
      durationSeconds: parseDurationNumber(parsedUnknown.format?.duration),
    };
  } catch {
    return null;
  }
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

const resolveTrimWindowArgs = (options?: VideoTranscodeOptions) => {
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

  const preInputArgs: string[] = [];
  const postInputArgs: string[] = [];
  if (typeof startSeconds === "number" && startSeconds > 0) {
    // Fast seek for conversion so late-start trims don't decode from the beginning.
    preInputArgs.push("-ss", `${startSeconds}`);
  }
  if (typeof durationSeconds === "number" && durationSeconds > 0) {
    postInputArgs.push("-t", `${durationSeconds}`);
  }

  return { preInputArgs, postInputArgs };
};

interface RunTranscodeOptions {
  preInputArgs?: string[];
  suppressedLogPatterns?: RegExp[];
}

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
    const inputExtension = getFileExtension(file.name);
    const forceMjpegInput =
      inputExtension === "mjpeg" || inputExtension === "mjpg";

    const handleProgress = (progress: { progress?: number; time?: number }) => {
      if (!onProgress || typeof progress.progress !== "number") {
        return;
      }
      const percent = Math.max(0, Math.min(100, Math.round(progress.progress * 100)));
      const rawTimeUs =
        typeof progress.time === "number" && Number.isFinite(progress.time) ? progress.time : null;
      onProgress({
        percent,
        timeUs: rawTimeUs,
        timeSeconds: rawTimeUs !== null ? Math.max(0, rawTimeUs / 1_000_000) : null,
      });
    };
    const handleLog = (log: { message?: string; type?: string }) => {
      const line = log.message?.trim();
      if (line) {
        recentLogLines.push(line);
        if (recentLogLines.length > 80) {
          recentLogLines.shift();
        }
      }
      if (!onLog) {
        return;
      }
      const isSuppressed =
        line !== undefined &&
        options.suppressedLogPatterns?.some((pattern) => pattern.test(line));
      if (isSuppressed) {
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
      onLog?.("[app] Staging source file...");
      await race(ffmpeg.writeFile(safeInputName, await fetchFile(file), writeOptions));
      onLog?.("[app] Source file staged.");
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
        onProgress?.({
          percent: 100,
          timeUs: null,
          timeSeconds: null,
        });
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
    const inputExt = getFileExtension(file.name);
    const safeInputName = inputExt
      ? `${jobId}-input.${inputExt}`
      : `${jobId}-input.bin`;
    const probeOutputName = `${jobId}-probe.json`;
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
        ? ["-f", "mjpeg", safeInputName]
        : [safeInputName];
      const probeArgs = [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        ...inputArgs,
        "-o",
        probeOutputName,
      ];
      if (onLog) {
        const displayInputArgs = forceMjpegInput
          ? ["-f", "mjpeg", file.name]
          : [file.name];
        onLog(
          `[app] ffprobe -v error -select_streams v:0 -show_streams -show_format -of json ${displayInputArgs.join(
            " "
          )} -o probe.json`
        );
      }

      const exitCode = await race(ffmpeg.ffprobe(probeArgs, undefined, writeOptions));
      if (typeof exitCode === "number" && exitCode !== 0) {
        const failureLog = pickFailureLogLine(logs);
        if (failureLog) {
          throw new Error(`FFprobe exited with code ${exitCode}. ${failureLog}`);
        }
        throw new Error(`FFprobe exited with code ${exitCode}.`);
      }
      const rawProbeOutput = await race(ffmpeg.readFile(probeOutputName, "utf8"));
      const probeOutput =
        typeof rawProbeOutput === "string"
          ? rawProbeOutput
          : new TextDecoder().decode(
              rawProbeOutput instanceof Uint8Array
                ? rawProbeOutput
                : new Uint8Array(rawProbeOutput)
            );
      const parsedProbeMetadata = parseMetadataFromFfprobeOutput(probeOutput);
      if (parsedProbeMetadata) {
        return parsedProbeMetadata;
      }
      const parsedFallbackMetadata = parseMetadataFromLogs(logs);
      if (parsedFallbackMetadata) {
        return parsedFallbackMetadata;
      }
      throw new Error("Failed to parse metadata from FFprobe output.");
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
    const { preInputArgs, postInputArgs } = resolveTrimWindowArgs(options);
    if (filter) {
      args.push("-vf", filter);
    }
    if (options?.fps) {
      args.push("-r", `${options.fps}`);
    }
    args.push(...postInputArgs);
    const quality = options?.quality ?? 3;
    args.push(
      "-c:v",
      "mjpeg",
      "-pix_fmt",
      "yuvj420p",
      "-color_range",
      "pc",
      "-q:v",
      `${quality}`
    );
    return this.runTranscode(file, "mjpeg", args, onProgress, onLog, signal, {
      preInputArgs,
      suppressedLogPatterns: [
        /Incompatible pixel format 'yuv420p' for codec 'mjpeg'/i,
        /\bdeprecated pixel format used, make sure you did set range correctly\b/i,
      ],
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
    const { preInputArgs, postInputArgs } = resolveTrimWindowArgs(options);
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
    args.push(...postInputArgs);

    args.push("-loop", "0");
    return this.runTranscode(file, "gif", args, onProgress, onLog, signal, {
      preInputArgs,
    });
  }

  async transcodeVideoToAvi(
    file: File,
    options?: VideoTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    const args: string[] = ["-sn", "-dn", "-map", "0:v:0", "-map", "0:a:0?"];
    const { preInputArgs, postInputArgs } = resolveTrimWindowArgs(options);
    const filterParts: string[] = [];
    if (options?.fps) {
      filterParts.push(`fps=${Math.max(1, Math.round(options.fps))}`);
    }
    const filter = buildVideoFilter(options);
    if (filter) {
      filterParts.push(filter);
    }
    if (filterParts.length > 0) {
      args.push("-vf", filterParts.join(","));
    }
    args.push(...postInputArgs);
    const quality = options?.quality ?? 10;
    args.push(
      "-c:v",
      "cinepak",
      "-q:v",
      `${quality}`,
      "-c:a",
      "libmp3lame",
      "-ac",
      "1",
      "-ar",
      "22050"
    );
    return this.runTranscode(file, "avi", args, onProgress, onLog, signal, {
      preInputArgs,
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

  async renderVideoMotionPreview(
    file: File,
    options?: Pick<
      VideoTranscodeOptions,
      | "width"
      | "height"
      | "orientation"
      | "scaleMode"
      | "cropRegion"
      | "fps"
      | "startSeconds"
      | "durationSeconds"
    >,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    const args: string[] = ["-an", "-sn", "-dn", "-map", "0:v:0"];
    const { preInputArgs, postInputArgs } = resolveTrimWindowArgs({
      startSeconds: options?.startSeconds,
      durationSeconds: options?.durationSeconds,
    });
    const filterParts: string[] = [];
    const previewFps =
      typeof options?.fps === "number" && Number.isFinite(options.fps) && options.fps > 0
        ? Math.max(1, Math.min(15, Math.round(options.fps)))
        : 12;
    filterParts.push(`fps=${previewFps}`);
    const scaleFilter = buildVideoFilter(options);
    if (scaleFilter) {
      filterParts.push(scaleFilter);
    }
    args.push("-vf", filterParts.join(","));
    args.push(...postInputArgs, "-loop", "0");
    return this.runTranscode(file, "gif", args, undefined, onLog, signal, {
      preInputArgs,
    });
  }

  async renderBrowserPlayableVideoProxy(
    file: File,
    options?: {
      fps?: number;
      maxWidth?: number;
      maxHeight?: number;
    },
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    const args: string[] = ["-an", "-sn", "-dn", "-map", "0:v:0"];
    const previewFps =
      typeof options?.fps === "number" && Number.isFinite(options.fps) && options.fps > 0
        ? Math.max(1, Math.min(15, Math.round(options.fps)))
        : 12;
    const maxWidth =
      typeof options?.maxWidth === "number" && Number.isFinite(options.maxWidth) && options.maxWidth > 0
        ? Math.max(64, Math.round(options.maxWidth))
        : 640;
    const maxHeight =
      typeof options?.maxHeight === "number" &&
      Number.isFinite(options.maxHeight) &&
      options.maxHeight > 0
        ? Math.max(64, Math.round(options.maxHeight))
        : 360;

    args.push(
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
      "yuv420p"
    );

    return this.runTranscode(file, "webm", args, undefined, onLog, signal);
  }

  async transcodeAudioToMp3(
    file: File,
    options?: AudioTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    const { preInputArgs, postInputArgs } = resolveTrimWindowArgs(options);
    const args: string[] = ["-vn"];
    const bitrate = options?.bitrateKbps ?? 128;
    args.push("-c:a", "libmp3lame", "-b:a", `${bitrate}k`);
    if (options?.sampleRate) {
      args.push("-ar", `${options.sampleRate}`);
    }
    if (options?.channels) {
      args.push("-ac", `${options.channels}`);
    }
    args.push(...postInputArgs);
    return this.runTranscode(file, "mp3", args, onProgress, onLog, signal, {
      preInputArgs,
    });
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
