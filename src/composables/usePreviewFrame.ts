import { onBeforeUnmount, ref, watch } from "vue";
import type { ComputedRef, Ref } from "vue";
import type {
  MediaLogCallback,
  VideoOrientation,
  VideoScaleMode,
  VideoTranscodeOptions,
} from "@/services/MediaProcessingService";
import { mediaProcessingService } from "@/services/mediaProcessingServiceInstance";

type OutputSizeMode = "original" | "custom";

interface UsePreviewFrameOptions {
  sourceFile: Ref<File | null>;
  isVideoSource: ComputedRef<boolean> | Ref<boolean>;
  isVideoOutput: ComputedRef<boolean> | Ref<boolean>;
  processing: Ref<boolean>;
  outputSizeMode: Ref<OutputSizeMode>;
  width: Ref<number | null>;
  height: Ref<number | null>;
  orientation: Ref<VideoOrientation>;
  scaleMode: Ref<VideoScaleMode>;
  fps: Ref<number | null>;
  quality: Ref<number | null>;
  startSeconds: Ref<number | null>;
  endSeconds: Ref<number | null>;
  ensureFfmpegReady: () => Promise<boolean>;
  onLog: MediaLogCallback;
}

export const usePreviewFrame = ({
  sourceFile,
  isVideoSource,
  isVideoOutput,
  processing,
  outputSizeMode,
  width,
  height,
  orientation,
  scaleMode,
  fps,
  quality,
  startSeconds,
  endSeconds,
  ensureFfmpegReady,
  onLog,
}: UsePreviewFrameOptions) => {
  const previewFrameUrl = ref<string | null>(null);
  const previewFrameBusy = ref(false);
  const previewFrameError = ref<string | null>(null);
  const previewFrameSeconds = ref<number | null>(0);

  let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let previewRefreshQueued = false;

  const revokePreviewUrl = () => {
    if (previewFrameUrl.value) {
      URL.revokeObjectURL(previewFrameUrl.value);
      previewFrameUrl.value = null;
    }
  };

  const clearPreviewFrame = () => {
    revokePreviewUrl();
    previewFrameError.value = null;
  };

  const clearPreviewDebounce = () => {
    if (previewDebounceTimer !== null) {
      clearTimeout(previewDebounceTimer);
      previewDebounceTimer = null;
    }
  };

  const generatePreviewFrame = async (
    config: { silentWhenUnavailable?: boolean } = {}
  ) => {
    const silentWhenUnavailable = config.silentWhenUnavailable ?? false;
    const file = sourceFile.value;
    if (!file || !isVideoSource.value || !isVideoOutput.value) {
      if (!silentWhenUnavailable) {
        previewFrameError.value = "Select a video file to generate a frame preview.";
      }
      return;
    }
    if (previewFrameBusy.value || processing.value) {
      previewRefreshQueued = true;
      return;
    }

    const ready = await ensureFfmpegReady();
    if (!ready) {
      if (!silentWhenUnavailable) {
        previewFrameError.value = "FFmpeg is not ready.";
      }
      return;
    }

    previewFrameBusy.value = true;
    previewFrameError.value = null;
    clearPreviewFrame();

    const options: Pick<
      VideoTranscodeOptions,
      "width" | "height" | "orientation" | "scaleMode" | "startSeconds"
    > = {
      orientation: orientation.value,
    };
    if (outputSizeMode.value === "custom" && width.value && height.value) {
      options.width = Math.max(1, Math.round(width.value));
      options.height = Math.max(1, Math.round(height.value));
      options.scaleMode = scaleMode.value;
    }
    if (typeof previewFrameSeconds.value === "number") {
      options.startSeconds = Math.max(0, previewFrameSeconds.value);
    }

    try {
      const result = await mediaProcessingService.renderVideoFramePreview(
        file,
        options,
        onLog
      );
      const previewBlob = new Blob([result.data], { type: "image/png" });
      previewFrameUrl.value = URL.createObjectURL(previewBlob);
    } catch (error) {
      previewFrameError.value =
        error instanceof Error ? error.message : "Failed to render preview frame.";
    } finally {
      previewFrameBusy.value = false;
      if (previewRefreshQueued && !processing.value) {
        previewRefreshQueued = false;
        schedulePreviewFrameRefresh(50);
      }
    }
  };

  const schedulePreviewFrameRefresh = (delayMs = 350) => {
    if (
      !sourceFile.value ||
      !isVideoSource.value ||
      !isVideoOutput.value ||
      processing.value
    ) {
      clearPreviewDebounce();
      previewRefreshQueued = false;
      return;
    }

    clearPreviewDebounce();
    previewDebounceTimer = setTimeout(() => {
      previewDebounceTimer = null;
      if (previewFrameBusy.value) {
        previewRefreshQueued = true;
        return;
      }
      void generatePreviewFrame({ silentWhenUnavailable: true });
    }, delayMs);
  };

  watch(
    () => [
      sourceFile.value?.name ?? "",
      sourceFile.value?.size ?? 0,
      sourceFile.value?.lastModified ?? 0,
      isVideoSource.value,
      isVideoOutput.value,
      outputSizeMode.value,
      width.value ?? 0,
      height.value ?? 0,
      orientation.value,
      scaleMode.value,
      fps.value ?? 0,
      quality.value ?? 0,
      startSeconds.value ?? 0,
      endSeconds.value ?? 0,
      previewFrameSeconds.value ?? 0,
    ],
    () => {
      if (!sourceFile.value || !isVideoSource.value || !isVideoOutput.value) {
        clearPreviewDebounce();
        previewRefreshQueued = false;
        clearPreviewFrame();
        return;
      }
      schedulePreviewFrameRefresh();
    }
  );

  watch(previewFrameBusy, (isBusy) => {
    if (isBusy || !previewRefreshQueued) {
      return;
    }
    previewRefreshQueued = false;
    schedulePreviewFrameRefresh(50);
  });

  onBeforeUnmount(() => {
    clearPreviewDebounce();
    clearPreviewFrame();
  });

  return {
    previewFrameUrl,
    previewFrameBusy,
    previewFrameError,
    previewFrameSeconds,
    clearPreviewFrame,
    clearPreviewDebounce,
    schedulePreviewFrameRefresh,
    generatePreviewFrame,
  };
};
