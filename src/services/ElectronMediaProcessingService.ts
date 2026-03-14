import type {
  AudioTranscodeOptions,
  MediaLogCallback,
  MediaProcessingResult,
  MediaProgressCallback,
  VideoMetadataResult,
  VideoTranscodeOptions,
} from "@/services/MediaProcessingService";
import { getElectronFilePath } from "@/services/electronFileRegistry";
import type { MediaProcessingContract } from "@/services/mediaProcessingContract";

type ElectronMediaAction =
  | "probeVideoMetadata"
  | "transcodeVideoToMjpeg"
  | "transcodeVideoToGif"
  | "transcodeVideoToAvi"
  | "renderVideoFramePreview"
  | "renderVideoMotionPreview"
  | "renderBrowserPlayableVideoProxy"
  | "transcodeAudioToMp3"
  | "extractAudioFromVideo";

interface SerializedInputFile {
  name: string;
  type: string;
  lastModified: number;
  data?: ArrayBuffer;
  path?: string;
}

interface MediaRunJobRequest {
  jobId: string;
  action: ElectronMediaAction;
  file: SerializedInputFile;
  options?: object;
}

interface AvailabilityResult {
  ok: boolean;
  message?: string;
}

const pickJobId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getElectronMediaApi = () => {
  if (typeof window === "undefined" || !window.electronMedia?.isElectron) {
    throw new Error("Electron media bridge is not available.");
  }
  return window.electronMedia;
};

const toError = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error;
  }
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return new Error(maybeMessage);
    }
  }
  return new Error(fallback);
};

const serializeFile = async (file: File): Promise<SerializedInputFile> => ({
  name: file.name,
  type: file.type,
  lastModified: file.lastModified,
  ...(getElectronFilePath(file)
    ? { path: getElectronFilePath(file) ?? undefined }
    : { data: await file.arrayBuffer() }),
});

export class ElectronMediaProcessingService implements MediaProcessingContract {
  private ready = false;
  private loadingPromise: Promise<void> | null = null;

  async ensureReady(): Promise<void> {
    if (this.ready) {
      return;
    }
    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }
    this.loadingPromise = (async () => {
      const result = (await getElectronMediaApi().checkAvailability()) as AvailabilityResult;
      if (!result.ok) {
        throw new Error(
          result.message ??
            "Native ffmpeg/ffprobe is not available in the Electron runtime."
        );
      }
      this.ready = true;
    })();
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async runJob<TResult>(
    action: ElectronMediaAction,
    file: File,
    options: object | undefined,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<TResult> {
    await this.ensureReady();

    const api = getElectronMediaApi();
    const jobId = pickJobId();
    const subscriptionId = api.subscribeToJobEvents((event) => {
      if (!event || event.jobId !== jobId) {
        return;
      }
      if (event.type === "progress" && event.progress && onProgress) {
        onProgress(event.progress);
      } else if (event.type === "log" && typeof event.message === "string" && onLog) {
        onLog(event.message);
      }
    });

    let abortHandler: (() => void) | null = null;
    if (signal) {
      abortHandler = () => {
        void api.cancelJob(jobId);
      };
      if (signal.aborted) {
        abortHandler();
      } else {
        signal.addEventListener("abort", abortHandler, { once: true });
      }
    }

    try {
      const request: MediaRunJobRequest = {
        jobId,
        action,
        file: await serializeFile(file),
        options,
      };
      return (await api.runJob(request)) as TResult;
    } catch (error) {
      throw toError(error, "Native FFmpeg processing failed.");
    } finally {
      api.unsubscribeFromJobEvents(subscriptionId);
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }

  async probeVideoMetadata(
    file: File,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<VideoMetadataResult> {
    return this.runJob<VideoMetadataResult>(
      "probeVideoMetadata",
      file,
      undefined,
      undefined,
      onLog,
      signal
    );
  }

  async transcodeVideoToMjpeg(
    file: File,
    options?: VideoTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    return this.runJob<MediaProcessingResult>(
      "transcodeVideoToMjpeg",
      file,
      options,
      onProgress,
      onLog,
      signal
    );
  }

  async transcodeVideoToGif(
    file: File,
    options?: VideoTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    return this.runJob<MediaProcessingResult>(
      "transcodeVideoToGif",
      file,
      options,
      onProgress,
      onLog,
      signal
    );
  }

  async transcodeVideoToAvi(
    file: File,
    options?: VideoTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    return this.runJob<MediaProcessingResult>(
      "transcodeVideoToAvi",
      file,
      options,
      onProgress,
      onLog,
      signal
    );
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
    return this.runJob<MediaProcessingResult>(
      "renderVideoFramePreview",
      file,
      options,
      undefined,
      onLog,
      signal
    );
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
    return this.runJob<MediaProcessingResult>(
      "renderVideoMotionPreview",
      file,
      options,
      undefined,
      onLog,
      signal
    );
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
    return this.runJob<MediaProcessingResult>(
      "renderBrowserPlayableVideoProxy",
      file,
      options,
      undefined,
      onLog,
      signal
    );
  }

  async transcodeAudioToMp3(
    file: File,
    options?: AudioTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    return this.runJob<MediaProcessingResult>(
      "transcodeAudioToMp3",
      file,
      options,
      onProgress,
      onLog,
      signal
    );
  }

  async extractAudioFromVideo(
    file: File,
    options?: AudioTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult> {
    return this.runJob<MediaProcessingResult>(
      "extractAudioFromVideo",
      file,
      options,
      onProgress,
      onLog,
      signal
    );
  }
}
