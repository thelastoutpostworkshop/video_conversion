<template>
  <div class="preview-shell">
    <div class="preview-surface" :style="previewSurfaceStyle">
      <img
        v-if="previewFrameUrl && isVideoOutput"
        :src="previewFrameUrl"
        alt="Generated preview frame"
        class="preview-frame-image"
      />
      <div v-else-if="previewFrameBusy && isVideoOutput" class="preview-placeholder">
        Generating frame preview...
      </div>
      <div v-else-if="!hasSourceFile" class="preview-placeholder">
        Select a media file to generate a preview.
      </div>
      <div v-else-if="!isVideoSource" class="preview-placeholder">
        Preview is available for video sources only.
      </div>
      <div v-else-if="!isVideoOutput" class="preview-placeholder">
        Switch to a video output format to preview frames.
      </div>
      <div v-else class="preview-placeholder">
        Adjust settings to generate a frame preview.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  previewFrameUrl: string | null;
  previewFrameBusy: boolean;
  hasSourceFile: boolean;
  isVideoSource: boolean;
  isVideoOutput: boolean;
  targetWidth: number | null;
  targetHeight: number | null;
}>();

const toPositivePixelDimension = (value: number | null): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.max(1, Math.round(value));
};

const previewSurfaceStyle = computed<Record<string, string>>(() => {
  const width = toPositivePixelDimension(props.targetWidth);
  const height = toPositivePixelDimension(props.targetHeight);
  if (!width || !height) {
    return {};
  }
  return {
    width: `${width}px`,
    height: `${height}px`,
    minHeight: `${height}px`,
  };
});
</script>

<style scoped>
.preview-shell {
  width: 100%;
  overflow: auto;
}

.preview-surface {
  width: 100%;
  min-height: 240px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  background:
    radial-gradient(circle at 15% 15%, rgba(var(--v-theme-primary), 0.12), transparent 35%),
    linear-gradient(160deg, #09131f 0%, #111c2b 50%, #152437 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  flex: 0 0 auto;
}

.preview-frame-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.preview-placeholder {
  color: rgba(255, 255, 255, 0.72);
  padding: 0 16px;
  text-align: center;
}
</style>
