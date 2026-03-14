<template>
  <div class="preview-shell">
    <div ref="surfaceRef" class="preview-surface" :style="previewSurfaceStyle">
      <img
        v-if="previewFrameUrl && isVideoOutput"
        ref="imageRef"
        :src="previewFrameUrl"
        alt="Generated preview frame"
        class="preview-frame-image"
        :class="{ 'preview-frame-image--cropped': showCroppedMainPreview }"
        :style="previewFrameImageStyle"
        @load="onPreviewImageLoad"
      />
      <div v-else-if="!hasSourceFile" class="preview-placeholder">
        Select source media to generate an output preview.
      </div>
      <div v-else-if="!isVideoSource" class="preview-placeholder">
        Output preview is available for video sources only.
      </div>
      <div v-else-if="!isVideoOutput" class="preview-placeholder">
        Switch to a video output format to show the converted result here.
      </div>
      <div v-else class="preview-placeholder">
        Adjust output settings to refresh the output preview.
      </div>

      <div
        v-if="showCropOverlay"
        class="crop-overlay"
        :class="{ 'crop-overlay--interactive': canInteractWithCrop }"
        :style="cropOverlayStyle"
      >
        <div
          class="crop-box"
          :class="{ 'crop-box--interactive': canInteractWithCrop }"
          :style="cropBoxStyle"
          @pointerdown.stop.prevent="startMoveCrop"
        >
          <div
            class="crop-handle crop-handle--nw"
            @pointerdown.stop.prevent="startResizeCrop('nw', $event)"
          />
          <div
            class="crop-handle crop-handle--ne"
            @pointerdown.stop.prevent="startResizeCrop('ne', $event)"
          />
          <div
            class="crop-handle crop-handle--sw"
            @pointerdown.stop.prevent="startResizeCrop('sw', $event)"
          />
          <div
            class="crop-handle crop-handle--se"
            @pointerdown.stop.prevent="startResizeCrop('se', $event)"
          />
        </div>
        <div v-if="canInteractWithCrop" class="crop-help-badge">
          Drag to move. Drag corners to resize.
        </div>
      </div>

      <div v-if="showCropPreviewActions" class="crop-preview-actions">
        <v-btn
          v-if="isCropPreviewApplied"
          size="small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-crop"
          @click="enterCropEditMode"
        >
          Edit crop
        </v-btn>
        <v-btn
          v-else
          size="small"
          variant="flat"
          color="primary"
          prepend-icon="mdi-check-circle-outline"
          @click="applyCropPreview"
        >
          Apply crop preview
        </v-btn>
      </div>

      <div
        v-if="previewFrameBusy && hasSourceFile && isVideoSource && isVideoOutput"
        class="preview-busy-overlay"
      >
        <div class="preview-busy-badge">
          <v-progress-circular indeterminate size="18" width="2" color="info" />
          <span>Generating frame preview...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

interface NormalizedCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

type ResizeMode = "nw" | "ne" | "sw" | "se";
type DragMode = "move" | ResizeMode;

interface DragState {
  pointerId: number;
  mode: DragMode;
  startX: number;
  startY: number;
  startRect: NormalizedCropRect;
  anchorX: number;
  anchorY: number;
}

const props = defineProps<{
  previewFrameUrl: string | null;
  previewFrameBusy: boolean;
  hasSourceFile: boolean;
  isVideoSource: boolean;
  isVideoOutput: boolean;
  roundDisplay?: boolean;
  targetWidth: number | null;
  targetHeight: number | null;
  cropEnabled?: boolean;
  cropRect?: NormalizedCropRect | null;
  cropAspectRatio?: number | null;
  cropInteractive?: boolean;
}>();

const emit = defineEmits<{
  (event: "update:crop-rect", value: NormalizedCropRect): void;
  (event: "update:crop-preview-applied", value: boolean): void;
}>();

const surfaceRef = ref<HTMLDivElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const imageLayout = ref<ImageLayout | null>(null);
const dragState = ref<DragState | null>(null);

let resizeObserver: ResizeObserver | null = null;

const toPositivePixelDimension = (value: number | null): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.max(1, Math.round(value));
};

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

const normalizeCropRect = (rect: NormalizedCropRect): NormalizedCropRect => {
  const minSize = 0.02;
  const width = Math.min(1, Math.max(minSize, clampUnit(rect.width)));
  const height = Math.min(1, Math.max(minSize, clampUnit(rect.height)));
  return {
    x: Math.min(1 - width, clampUnit(rect.x)),
    y: Math.min(1 - height, clampUnit(rect.y)),
    width,
    height,
  };
};

const isCropRectEqual = (a: NormalizedCropRect, b: NormalizedCropRect) =>
  Math.abs(a.x - b.x) < 0.00001 &&
  Math.abs(a.y - b.y) < 0.00001 &&
  Math.abs(a.width - b.width) < 0.00001 &&
  Math.abs(a.height - b.height) < 0.00001;

const previewSurfaceStyle = computed<Record<string, string>>(() => {
  const width = toPositivePixelDimension(props.targetWidth);
  const height = toPositivePixelDimension(props.targetHeight);
  if (props.roundDisplay && width && height) {
    const size = Math.max(1, Math.min(width, height));
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
  return {
    width: `${width}px`,
    height: `${height}px`,
    minHeight: `${height}px`,
    borderRadius: props.roundDisplay ? "50%" : "0",
  };
});

const normalizedCropRect = computed<NormalizedCropRect | null>(() => {
  if (!props.cropRect) {
    return null;
  }
  return normalizeCropRect(props.cropRect);
});

const isCropPreviewApplied = ref(false);

const canShowCropPreview = computed(
  () =>
    props.cropEnabled === true &&
    Boolean(normalizedCropRect.value) &&
    Boolean(props.previewFrameUrl) &&
    props.isVideoOutput
);

const showCroppedMainPreview = computed(
  () => canShowCropPreview.value && isCropPreviewApplied.value
);

const showCropPreviewActions = computed(() => canShowCropPreview.value);

const previewFrameImageStyle = computed<Record<string, string>>(() => {
  if (!showCroppedMainPreview.value) {
    return {};
  }
  const rect = normalizedCropRect.value;
  if (!rect) {
    return {};
  }
  return {
    width: `${100 / rect.width}%`,
    height: `${100 / rect.height}%`,
    left: `${-(rect.x / rect.width) * 100}%`,
    top: `${-(rect.y / rect.height) * 100}%`,
  };
});

const showCropOverlay = computed(
  () =>
    props.cropEnabled === true &&
    Boolean(props.cropRect) &&
    Boolean(props.previewFrameUrl) &&
    props.isVideoOutput &&
    Boolean(imageLayout.value) &&
    !showCroppedMainPreview.value
);

const canInteractWithCrop = computed(
  () => showCropOverlay.value && props.cropInteractive !== false
);

const applyCropPreview = () => {
  if (!canShowCropPreview.value) {
    return;
  }
  clearDragState();
  isCropPreviewApplied.value = true;
  imageLayout.value = null;
};

const enterCropEditMode = async () => {
  if (!canShowCropPreview.value) {
    return;
  }
  isCropPreviewApplied.value = false;
  await nextTick();
  updateImageLayout();
};

const cropOverlayStyle = computed<Record<string, string>>(() => {
  const layout = imageLayout.value;
  if (!layout) {
    return { display: "none" };
  }
  return {
    left: `${layout.left}px`,
    top: `${layout.top}px`,
    width: `${layout.width}px`,
    height: `${layout.height}px`,
  };
});

const cropBoxStyle = computed<Record<string, string>>(() => {
  const rect = props.cropRect;
  if (!rect) {
    return {
      display: "none",
    };
  }
  const normalized = normalizeCropRect(rect);
  return {
    left: `${normalized.x * 100}%`,
    top: `${normalized.y * 100}%`,
    width: `${normalized.width * 100}%`,
    height: `${normalized.height * 100}%`,
  };
});

const getAspectScale = (): number | null => {
  const layout = imageLayout.value;
  const targetAspect = props.cropAspectRatio ?? null;
  if (!layout || !targetAspect || targetAspect <= 0) {
    return null;
  }
  const imageAspect = layout.width / layout.height;
  if (!Number.isFinite(imageAspect) || imageAspect <= 0) {
    return null;
  }
  return imageAspect / targetAspect;
};

const updateImageLayout = () => {
  const imageEl = imageRef.value;
  if (
    !imageEl ||
    !props.previewFrameUrl ||
    !props.isVideoOutput ||
    showCroppedMainPreview.value
  ) {
    imageLayout.value = null;
    return;
  }

  const containerWidth = imageEl.clientWidth;
  const containerHeight = imageEl.clientHeight;
  const naturalWidth = imageEl.naturalWidth;
  const naturalHeight = imageEl.naturalHeight;
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    imageLayout.value = null;
    return;
  }

  const containerAspect = containerWidth / containerHeight;
  const imageAspect = naturalWidth / naturalHeight;

  let width = containerWidth;
  let height = containerHeight;
  let left = 0;
  let top = 0;

  if (containerAspect > imageAspect) {
    height = containerHeight;
    width = height * imageAspect;
    left = (containerWidth - width) / 2;
  } else {
    width = containerWidth;
    height = width / imageAspect;
    top = (containerHeight - height) / 2;
  }

  imageLayout.value = { left, top, width, height };
};

const emitCropRect = (rect: NormalizedCropRect) => {
  const nextRect = normalizeCropRect(rect);
  if (props.cropRect && isCropRectEqual(nextRect, normalizeCropRect(props.cropRect))) {
    return;
  }
  emit("update:crop-rect", nextRect);
};

const toNormalizedPointer = (event: PointerEvent): { x: number; y: number } | null => {
  const surface = surfaceRef.value;
  const layout = imageLayout.value;
  if (!surface || !layout) {
    return null;
  }
  const bounds = surface.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0 || layout.width <= 0 || layout.height <= 0) {
    return null;
  }
  const x = (event.clientX - bounds.left - layout.left) / layout.width;
  const y = (event.clientY - bounds.top - layout.top) / layout.height;
  return {
    x: clampUnit(x),
    y: clampUnit(y),
  };
};

const clearDragState = () => {
  dragState.value = null;
};

const startMoveCrop = (event: PointerEvent) => {
  if (!canInteractWithCrop.value || !props.cropRect) {
    return;
  }
  const rect = normalizeCropRect(props.cropRect);
  dragState.value = {
    pointerId: event.pointerId,
    mode: "move",
    startX: event.clientX,
    startY: event.clientY,
    startRect: rect,
    anchorX: 0,
    anchorY: 0,
  };
};

const startResizeCrop = (mode: ResizeMode, event: PointerEvent) => {
  if (!canInteractWithCrop.value || !props.cropRect) {
    return;
  }
  const rect = normalizeCropRect(props.cropRect);
  let anchorX = rect.x;
  let anchorY = rect.y;

  if (mode === "nw") {
    anchorX = rect.x + rect.width;
    anchorY = rect.y + rect.height;
  } else if (mode === "ne") {
    anchorX = rect.x;
    anchorY = rect.y + rect.height;
  } else if (mode === "sw") {
    anchorX = rect.x + rect.width;
    anchorY = rect.y;
  }

  dragState.value = {
    pointerId: event.pointerId,
    mode,
    startX: event.clientX,
    startY: event.clientY,
    startRect: rect,
    anchorX,
    anchorY,
  };
};

const handleResizeDrag = (state: DragState, event: PointerEvent) => {
  const pointer = toNormalizedPointer(event);
  const layout = imageLayout.value;
  const aspectScale = getAspectScale();
  if (!pointer || !layout || !aspectScale || aspectScale <= 0) {
    return;
  }

  let distanceX = 0;
  let distanceY = 0;
  let maxWidthX = 0;
  let maxHeightY = 0;

  if (state.mode === "nw") {
    distanceX = state.anchorX - pointer.x;
    distanceY = state.anchorY - pointer.y;
    maxWidthX = state.anchorX;
    maxHeightY = state.anchorY;
  } else if (state.mode === "ne") {
    distanceX = pointer.x - state.anchorX;
    distanceY = state.anchorY - pointer.y;
    maxWidthX = 1 - state.anchorX;
    maxHeightY = state.anchorY;
  } else if (state.mode === "sw") {
    distanceX = state.anchorX - pointer.x;
    distanceY = pointer.y - state.anchorY;
    maxWidthX = state.anchorX;
    maxHeightY = 1 - state.anchorY;
  } else if (state.mode === "se") {
    distanceX = pointer.x - state.anchorX;
    distanceY = pointer.y - state.anchorY;
    maxWidthX = 1 - state.anchorX;
    maxHeightY = 1 - state.anchorY;
  } else {
    return;
  }

  const maxWidthByHeight = maxHeightY / aspectScale;
  const maxWidth = Math.max(0, Math.min(maxWidthX, maxWidthByHeight));
  if (maxWidth <= 0) {
    return;
  }

  const minPixels = 24;
  const minWidthByWidth = minPixels / layout.width;
  const minWidthByHeight = (minPixels / layout.height) / aspectScale;
  const minWidth = Math.min(maxWidth, Math.max(minWidthByWidth, minWidthByHeight));

  const widthByPointer = Math.min(Math.max(0, distanceX), Math.max(0, distanceY) / aspectScale);
  const width = Math.max(minWidth, Math.min(maxWidth, widthByPointer));
  const height = width * aspectScale;

  let x = state.anchorX;
  let y = state.anchorY;
  if (state.mode === "nw") {
    x = state.anchorX - width;
    y = state.anchorY - height;
  } else if (state.mode === "ne") {
    x = state.anchorX;
    y = state.anchorY - height;
  } else if (state.mode === "sw") {
    x = state.anchorX - width;
    y = state.anchorY;
  } else if (state.mode === "se") {
    x = state.anchorX;
    y = state.anchorY;
  }

  emitCropRect({ x, y, width, height });
};

const handleMoveDrag = (state: DragState, event: PointerEvent) => {
  const layout = imageLayout.value;
  if (!layout || layout.width <= 0 || layout.height <= 0) {
    return;
  }
  const dx = (event.clientX - state.startX) / layout.width;
  const dy = (event.clientY - state.startY) / layout.height;
  const nextX = Math.min(1 - state.startRect.width, Math.max(0, state.startRect.x + dx));
  const nextY = Math.min(1 - state.startRect.height, Math.max(0, state.startRect.y + dy));
  emitCropRect({
    x: nextX,
    y: nextY,
    width: state.startRect.width,
    height: state.startRect.height,
  });
};

const onWindowPointerMove = (event: PointerEvent) => {
  const state = dragState.value;
  if (!state || state.pointerId !== event.pointerId) {
    return;
  }
  if (state.mode === "move") {
    handleMoveDrag(state, event);
    return;
  }
  handleResizeDrag(state, event);
};

const onWindowPointerEnd = (event: PointerEvent) => {
  const state = dragState.value;
  if (!state || state.pointerId !== event.pointerId) {
    return;
  }
  clearDragState();
};

const onPreviewImageLoad = () => {
  updateImageLayout();
};

watch(
  () => props.previewFrameUrl,
  async () => {
    clearDragState();
    await nextTick();
    updateImageLayout();
  }
);

watch(
  () => [props.targetWidth, props.targetHeight, props.roundDisplay],
  async () => {
    await nextTick();
    updateImageLayout();
  }
);

watch(
  () => props.cropEnabled,
  (enabled) => {
    if (!enabled) {
      clearDragState();
      isCropPreviewApplied.value = false;
      imageLayout.value = null;
      return;
    }
    isCropPreviewApplied.value = false;
    void nextTick(() => {
      updateImageLayout();
    });
  }
);

watch(
  () => canShowCropPreview.value,
  (canShow) => {
    if (canShow) {
      return;
    }
    clearDragState();
    isCropPreviewApplied.value = false;
    imageLayout.value = null;
  }
);

watch(
  () => showCroppedMainPreview.value,
  async () => {
    clearDragState();
    await nextTick();
    updateImageLayout();
  }
);

watch(
  () => isCropPreviewApplied.value,
  (applied) => {
    emit("update:crop-preview-applied", applied);
  },
  { immediate: true }
);

onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerEnd);
    window.addEventListener("pointercancel", onWindowPointerEnd);
    window.addEventListener("resize", updateImageLayout);
  }
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      updateImageLayout();
    });
    if (surfaceRef.value) {
      resizeObserver.observe(surfaceRef.value);
    }
  }
  void nextTick(() => {
    updateImageLayout();
  });
});

onBeforeUnmount(() => {
  clearDragState();
  if (typeof window !== "undefined") {
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerEnd);
    window.removeEventListener("pointercancel", onWindowPointerEnd);
    window.removeEventListener("resize", updateImageLayout);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});
</script>

<style scoped>
.preview-shell {
  width: 100%;
  overflow: auto;
}

.preview-surface {
  position: relative;
  width: 100%;
  min-height: 240px;
  border-radius: 0;
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
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.preview-frame-image--cropped {
  position: absolute;
  object-fit: fill;
}

.preview-placeholder {
  color: rgba(255, 255, 255, 0.72);
  padding: 0 16px;
  text-align: center;
}

.crop-overlay {
  position: absolute;
  z-index: 2;
  pointer-events: none;
}

.crop-overlay--interactive {
  pointer-events: auto;
}

.crop-preview-actions {
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 3;
}

.crop-box {
  position: absolute;
  border: 2px solid rgba(var(--v-theme-primary), 0.95);
  box-shadow: 0 0 0 9999px rgba(6, 11, 19, 0.5);
}

.crop-box--interactive {
  cursor: move;
}

.crop-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.9);
  background: rgba(var(--v-theme-primary), 0.96);
}

.crop-handle--nw {
  left: -7px;
  top: -7px;
  cursor: nwse-resize;
}

.crop-handle--ne {
  right: -7px;
  top: -7px;
  cursor: nesw-resize;
}

.crop-handle--sw {
  left: -7px;
  bottom: -7px;
  cursor: nesw-resize;
}

.crop-handle--se {
  right: -7px;
  bottom: -7px;
  cursor: nwse-resize;
}

.crop-help-badge {
  position: absolute;
  left: 8px;
  top: 8px;
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(10, 16, 28, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.1;
}

.preview-busy-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(5, 10, 18, 0.14);
}

.preview-busy-badge {
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
