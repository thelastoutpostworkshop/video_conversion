<template>
  <div class="motion-preview-shell">
    <div class="motion-preview-surface" :style="previewSurfaceStyle">
      <img
        v-if="previewMotionUrl && isVideoOutput"
        :src="previewMotionUrl"
        alt="Generated motion preview"
        class="motion-preview-image"
      />
      <div v-else-if="!hasSourceFile" class="motion-preview-placeholder">
        Select a media file to generate a motion preview.
      </div>
      <div v-else-if="!isVideoSource" class="motion-preview-placeholder">
        Motion preview is available for video sources only.
      </div>
      <div v-else-if="!isVideoOutput" class="motion-preview-placeholder">
        Switch to a video output format to preview motion.
      </div>
      <div v-else class="motion-preview-placeholder">
        Generate a motion preview from the trim player above.
      </div>

      <div
        v-if="previewMotionBusy && hasSourceFile && isVideoSource && isVideoOutput"
        class="motion-preview-busy-overlay"
      >
        <div class="motion-preview-busy-badge">
          <v-progress-circular indeterminate size="18" width="2" color="info" />
          <span>Generating motion preview...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  previewMotionUrl: string | null;
  previewMotionBusy: boolean;
  hasSourceFile: boolean;
  isVideoSource: boolean;
  isVideoOutput: boolean;
  roundDisplay?: boolean;
  targetWidth: number | null;
  targetHeight: number | null;
  displayScale?: number;
}>();

const toPositivePixelDimension = (value: number | null): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.max(1, Math.round(value));
};

const toPositiveScale = (value: number | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.max(0.1, value);
};

const previewSurfaceStyle = computed<Record<string, string>>(() => {
  const width = toPositivePixelDimension(props.targetWidth);
  const height = toPositivePixelDimension(props.targetHeight);
  const scale = toPositiveScale(props.displayScale);
  if (props.roundDisplay && width && height) {
    const size = Math.max(1, Math.round(Math.min(width, height) * scale));
    return {
      width: `${size}px`,
      height: `${size}px`,
      minHeight: `${size}px`,
      borderRadius: "50%",
    };
  }
  if (!width || !height) {
    return { borderRadius: props.roundDisplay ? "50%" : "0" };
  }
  const scaledWidth = Math.max(1, Math.round(width * scale));
  const scaledHeight = Math.max(1, Math.round(height * scale));
  return {
    width: `${scaledWidth}px`,
    height: `${scaledHeight}px`,
    minHeight: `${scaledHeight}px`,
    borderRadius: props.roundDisplay ? "50%" : "0",
  };
});
</script>

<style scoped>
.motion-preview-shell {
  width: 100%;
  overflow: auto;
}

.motion-preview-surface {
  position: relative;
  width: 100%;
  min-height: 180px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  background:
    radial-gradient(circle at 15% 15%, rgba(var(--v-theme-info), 0.12), transparent 35%),
    linear-gradient(160deg, #09131f 0%, #111c2b 50%, #152437 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  flex: 0 0 auto;
}

.motion-preview-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.motion-preview-placeholder {
  color: rgba(255, 255, 255, 0.72);
  padding: 0 16px;
  text-align: center;
}

.motion-preview-busy-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(5, 10, 18, 0.14);
}

.motion-preview-busy-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(10, 16, 28, 0.76);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1;
}
</style>
