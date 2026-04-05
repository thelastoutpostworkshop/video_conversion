import { onBeforeUnmount, ref, watch } from "vue";
import type { ComputedRef, Ref } from "vue";
import type {
  MediaLogCallback,
  VideoOrientation,
  VideoScaleMode,
  VideoTranscodeOptions,
} from "@/services/MediaProcessingService";
import { mediaProcessingService } from "@/services/mediaProcessingServiceInstance";
import { isElectronRuntime } from "@/services/runtimeEnvironment";
import { getBrowserFfmpegSourceFileSizeError } from "@/services/webMediaLimits";

type OutputSizeMode = "original" | "custom";

interface UsePreviewFrameOptions {
  sourceFile: Ref<File | null>;
  isVideoSource: ComputedRef<boolean> | Ref<boolean>;
  isVideoOutput: ComputedRef<boolean> | Ref<boolean>;
  processing: Ref<boolean>;
  externalBusy?: Ref<boolean>;
  outputSizeMode: ComputedRef<OutputSizeMode> | Ref<OutputSizeMode>;
  width: Ref<number | null>;
  height: Ref<number | null>;
  orientation: Ref<VideoOrientation>;
  scaleMode: Ref<VideoScaleMode>;
  ensureFfmpegReady: () => Promise<boolean>;
  onLog: MediaLogCallback;
}

export const usePreviewFrame = ({
  sourceFile,
  isVideoSource,
  isVideoOutput,
  processing,
  externalBusy,
  outputSizeMode,
  width,
  height,
  orientation,
  scaleMode,
  ensureFfmpegReady,
  onLog,
}: UsePreviewFrameOptions) => {
  const previewFrameUrl = ref<string | null>(null);
  const previewFrameBusy = ref(false);
  const previewFrameError = ref<string | null>(null);
  const previewFrameSeconds = ref<number | null>(0);

  let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let previewRefreshQueued = false;
  let activePreviewRequestKey: string | null = null;
  let lastRenderedPreviewRequestKey: string | null = null;

  const revokePreviewUrl = () => {
    if (previewFrameUrl.value) {
      URL.revokeObjectURL(previewFrameUrl.value);
      previewFrameUrl.value = null;
    }
  };

  const clearPreviewFrame = () => {
    revokePreviewUrl();
    previewFrameError.value = null;
    lastRenderedPreviewRequestKey = null;
  };

  const clearPreviewDebounce = () => {
    if (previewDebounceTimer !== null) {
      clearTimeout(previewDebounceTimer);
      previewDebounceTimer = null;
    }
  };

  const normalizePreviewSecond = (value: number | null) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "0.000";
    }
    return Math.max(0, value).toFixed(3);
  };

  const getPreviewRequestKey = () => {
    const file = sourceFile.value;
    if (!file || !isVideoSource.value || !isVideoOutput.value) {
      return null;
    }

    const segments = [
      file.name,
      String(file.size),
      String(file.lastModified),
      orientation.value,
      outputSizeMode.value,
      normalizePreviewSecond(previewFrameSeconds.value),
    ];

    if (outputSizeMode.value === "custom") {
      segments.push(
        String(width.value ?? 0),
        String(height.value ?? 0),
        scaleMode.value
      );
    }

    return segments.join("|");
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

    const requestKey = getPreviewRequestKey();
    if (
      requestKey &&
      previewFrameUrl.value &&
      requestKey === lastRenderedPreviewRequestKey
    ) {
      return;
    }
    if (previewFrameBusy.value || processing.value || externalBusy?.value) {
      if (requestKey && requestKey === activePreviewRequestKey) {
        return;
      }
      previewRefreshQueued = true;
      return;
    }

    if (!isElectronRuntime()) {
      const limitError = getBrowserFfmpegSourceFileSizeError(file);
      if (limitError) {
        previewFrameError.value = limitError;
        return;
      }
    }

    const ready = await ensureFfmpegReady();
    if (!ready) {
      if (!silentWhenUnavailable) {
        previewFrameError.value = "FFmpeg is not ready.";
      }
      return;
    }

    previewFrameBusy.value = true;
    activePreviewRequestKey = requestKey;
    previewFrameError.value = null;

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
      const nextPreviewUrl = URL.createObjectURL(previewBlob);
      if (previewFrameUrl.value) {
        URL.revokeObjectURL(previewFrameUrl.value);
      }
      previewFrameUrl.value = nextPreviewUrl;
      lastRenderedPreviewRequestKey = requestKey;
    } catch (error) {
      previewFrameError.value =
        error instanceof Error ? error.message : "Failed to render preview frame.";
    } finally {
      previewFrameBusy.value = false;
      activePreviewRequestKey = null;
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

    const requestKey = getPreviewRequestKey();
    if (!requestKey) {
      clearPreviewDebounce();
      previewRefreshQueued = false;
      return;
    }

    if (
      (previewFrameUrl.value && requestKey === lastRenderedPreviewRequestKey) ||
      requestKey === activePreviewRequestKey
    ) {
      clearPreviewDebounce();
      previewRefreshQueued = false;
      return;
    }

    if (externalBusy?.value) {
      clearPreviewDebounce();
      previewRefreshQueued = true;
      return;
    }

    clearPreviewDebounce();
    previewDebounceTimer = setTimeout(() => {
      previewDebounceTimer = null;
      if (previewFrameBusy.value || externalBusy?.value) {
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
    if (isBusy || externalBusy?.value || !previewRefreshQueued) {
      return;
    }
    previewRefreshQueued = false;
    schedulePreviewFrameRefresh(50);
  });

  watch(
    () => externalBusy?.value ?? false,
    (isBusy) => {
      if (isBusy || !previewRefreshQueued) {
        return;
      }
      previewRefreshQueued = false;
      schedulePreviewFrameRefresh(50);
    }
  );

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
