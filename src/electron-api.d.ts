import type { MediaProgressInfo, VideoTranscodeOptions } from "@/services/MediaProcessingService";

interface ElectronMediaEventPayload {
  jobId: string;
  type: "log" | "progress";
  message?: string;
  progress?: MediaProgressInfo;
}

interface ElectronMediaAvailabilityResult {
  ok: boolean;
  message?: string;
}

interface ElectronPickedSourceFile {
  path: string;
  name: string;
  type: string;
  lastModified: number;
  data: ArrayBuffer | Uint8Array;
}

interface ElectronPickSourceFileResult {
  canceled: boolean;
  file?: ElectronPickedSourceFile;
}

interface ElectronPickSavePathRequest {
  defaultPath: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

interface ElectronPickSavePathResult {
  canceled: boolean;
  path: string | null;
}

interface ElectronSerializedInputFile {
  name: string;
  type: string;
  lastModified: number;
  data?: ArrayBuffer;
  path?: string;
}

interface ElectronPlayMotionPreviewRequest {
  file: ElectronSerializedInputFile;
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
  >;
}

interface ElectronMediaBridge {
  isElectron: boolean;
  checkAvailability(): Promise<ElectronMediaAvailabilityResult>;
  runJob(request: unknown): Promise<unknown>;
  cancelJob(jobId: string): Promise<{ ok: boolean }>;
  pickSourceFile(): Promise<ElectronPickSourceFileResult>;
  pickSavePath(request: ElectronPickSavePathRequest): Promise<ElectronPickSavePathResult>;
  getPathForFile(file: File): string | null;
  revealPath(targetPath: string): Promise<{ ok: boolean }>;
  playMotionPreview(request: ElectronPlayMotionPreviewRequest): Promise<{ ok: boolean }>;
  subscribeToJobEvents(callback: (event: ElectronMediaEventPayload) => void): string;
  unsubscribeFromJobEvents(subscriptionId: string): void;
}

declare global {
  interface Window {
    electronMedia?: ElectronMediaBridge;
  }
}

export {};
