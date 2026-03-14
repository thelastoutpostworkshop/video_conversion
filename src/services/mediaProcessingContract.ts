import type {
  AudioTranscodeOptions,
  MediaLogCallback,
  MediaProcessingResult,
  MediaProgressCallback,
  VideoMetadataResult,
  VideoTranscodeOptions,
} from "@/services/MediaProcessingService";

export interface MediaProcessingContract {
  ensureReady(): Promise<void>;
  probeVideoMetadata(
    file: File,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<VideoMetadataResult>;
  transcodeVideoToMjpeg(
    file: File,
    options?: VideoTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult>;
  transcodeVideoToGif(
    file: File,
    options?: VideoTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult>;
  transcodeVideoToAvi(
    file: File,
    options?: VideoTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult>;
  renderVideoFramePreview(
    file: File,
    options?: Pick<
      VideoTranscodeOptions,
      "width" | "height" | "orientation" | "scaleMode" | "startSeconds"
    >,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult>;
  renderVideoMotionPreview(
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
  ): Promise<MediaProcessingResult>;
  renderBrowserPlayableVideoProxy(
    file: File,
    options?: {
      fps?: number;
      maxWidth?: number;
      maxHeight?: number;
    },
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult>;
  transcodeAudioToMp3(
    file: File,
    options?: AudioTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult>;
  extractAudioFromVideo(
    file: File,
    options?: AudioTranscodeOptions,
    onProgress?: MediaProgressCallback,
    onLog?: MediaLogCallback,
    signal?: AbortSignal
  ): Promise<MediaProcessingResult>;
}
