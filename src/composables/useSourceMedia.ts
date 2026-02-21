import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { VideoMetadataResult } from "@/services/MediaProcessingService";
import { mediaProcessingService } from "@/services/mediaProcessingServiceInstance";

const videoExtensions = [
  ".avi",
  ".mjpeg",
  ".mjpg",
  ".mov",
  ".mkv",
  ".mp4",
  ".webm",
];

export const useSourceMedia = () => {
  const sourceFile = ref<File | null>(null);
  let metadataProbeAbortController: AbortController | null = null;

  const sourceMetadata = ref<VideoMetadataResult | null>(null);
  const sourceMetadataLoading = ref(false);
  const sourceMetadataError = ref<string | null>(null);

  const formatDurationClock = (rawSeconds: number) => {
    const normalized = Math.max(0, Math.round(rawSeconds * 10) / 10);
    const totalSeconds = Math.floor(normalized);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secondsValue = normalized - hours * 3600 - minutes * 60;
    const minutesLabel = String(minutes).padStart(2, "0");
    const secondsLabel = secondsValue.toFixed(1).padStart(4, "0");
    if (hours > 0) {
      return `${hours}:${minutesLabel}:${secondsLabel}`;
    }
    return `${minutesLabel}:${secondsLabel}`;
  };

  const isVideoSource = computed(() => {
    if (!sourceFile.value) {
      return false;
    }
    if (sourceFile.value.type.startsWith("video/")) {
      return true;
    }
    const lowerName = sourceFile.value.name.toLowerCase();
    return videoExtensions.some((extension) => lowerName.endsWith(extension));
  });

  const sourceMetadataLabel = computed(() => {
    if (!sourceFile.value) {
      return "No file selected.";
    }
    if (!isVideoSource.value) {
      return "Audio source selected.";
    }
    if (!sourceMetadata.value) {
      return "Metadata not available yet.";
    }
    const duration = sourceMetadata.value.durationSeconds;
    const durationLabel =
      typeof duration === "number" ? formatDurationClock(duration) : "unknown duration";
    return `${sourceMetadata.value.width}x${sourceMetadata.value.height}, ${durationLabel}`;
  });

  const readVideoMetadata = async (file: File): Promise<VideoMetadataResult> => {
    const tempUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        video.onloadedmetadata = null;
        video.onerror = null;
        video.removeAttribute("src");
        URL.revokeObjectURL(tempUrl);
      };
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const widthValue = video.videoWidth;
        const heightValue = video.videoHeight;
        const durationValue = Number.isFinite(video.duration) ? video.duration : null;
        cleanup();
        if (widthValue <= 0 || heightValue <= 0) {
          reject(new Error("Video dimensions are not available."));
          return;
        }
        resolve({
          width: widthValue,
          height: heightValue,
          durationSeconds: durationValue,
        });
      };
      video.onerror = () => {
        cleanup();
        reject(new Error("Failed to read video metadata."));
      };
      video.src = tempUrl;
    });
  };

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const cancelMetadataProbe = () => {
    if (metadataProbeAbortController) {
      metadataProbeAbortController.abort();
      metadataProbeAbortController = null;
    }
  };

  const loadSourceMetadata = async () => {
    const file = sourceFile.value;
    cancelMetadataProbe();
    if (!file || !isVideoSource.value) {
      sourceMetadata.value = null;
      sourceMetadataError.value = null;
      sourceMetadataLoading.value = false;
      return;
    }

    const probeAbortController = new AbortController();
    metadataProbeAbortController = probeAbortController;
    const isCurrentRequest = () =>
      sourceFile.value === file &&
      metadataProbeAbortController === probeAbortController &&
      !probeAbortController.signal.aborted;

    sourceMetadataLoading.value = true;
    sourceMetadataError.value = null;
    try {
      let metadata: VideoMetadataResult | null = null;
      try {
        metadata = await readVideoMetadata(file);
      } catch (browserError) {
        if (!isCurrentRequest()) {
          return;
        }
        try {
          metadata = await mediaProcessingService.probeVideoMetadata(
            file,
            undefined,
            probeAbortController.signal
          );
        } catch (ffmpegError) {
          const browserMessage = getErrorMessage(
            browserError,
            "Failed to read video metadata."
          );
          const ffmpegMessage = getErrorMessage(
            ffmpegError,
            "Failed to probe video metadata with FFmpeg."
          );
          throw new Error(`${browserMessage} FFmpeg fallback failed: ${ffmpegMessage}`);
        }
      }

      if (!metadata || !isCurrentRequest()) {
        return;
      }
      sourceMetadata.value = metadata;
    } catch (error) {
      if (sourceFile.value !== file || probeAbortController.signal.aborted) {
        return;
      }
      sourceMetadata.value = null;
      sourceMetadataError.value = getErrorMessage(
        error,
        "Failed to read source metadata."
      );
    } finally {
      if (metadataProbeAbortController === probeAbortController) {
        metadataProbeAbortController = null;
      }
      if (sourceFile.value === file) {
        sourceMetadataLoading.value = false;
      }
    }
  };

  watch(sourceFile, () => {
    void loadSourceMetadata();
  });

  onBeforeUnmount(() => {
    cancelMetadataProbe();
  });

  return {
    sourceFile,
    isVideoSource,
    sourceMetadata,
    sourceMetadataLoading,
    sourceMetadataError,
    sourceMetadataLabel,
  };
};
