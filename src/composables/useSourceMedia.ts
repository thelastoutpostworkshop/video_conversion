import { computed, ref, watch } from "vue";
import type { VideoMetadataResult } from "@/services/MediaProcessingService";

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

  const sourceMetadata = ref<VideoMetadataResult | null>(null);
  const sourceMetadataLoading = ref(false);
  const sourceMetadataError = ref<string | null>(null);

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
      typeof duration === "number" ? `${duration.toFixed(2)} s` : "unknown duration";
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

  const loadSourceMetadata = async () => {
    const file = sourceFile.value;
    if (!file || !isVideoSource.value) {
      sourceMetadata.value = null;
      sourceMetadataError.value = null;
      sourceMetadataLoading.value = false;
      return;
    }
    sourceMetadataLoading.value = true;
    sourceMetadataError.value = null;
    try {
      const metadata = await readVideoMetadata(file);
      if (sourceFile.value !== file) {
        return;
      }
      sourceMetadata.value = metadata;
    } catch (error) {
      if (sourceFile.value !== file) {
        return;
      }
      sourceMetadata.value = null;
      sourceMetadataError.value =
        error instanceof Error ? error.message : "Failed to read source metadata.";
    } finally {
      if (sourceFile.value === file) {
        sourceMetadataLoading.value = false;
      }
    }
  };

  watch(sourceFile, () => {
    void loadSourceMetadata();
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
