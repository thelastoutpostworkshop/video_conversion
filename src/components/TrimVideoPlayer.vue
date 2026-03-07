<template>
  <v-card
    variant="tonal"
    class="trim-player-card"
    :class="{ 'trim-player-card--inactive': !canRenderVideo }"
  >
    <v-card-text class="trim-player-card__body">
      <div class="d-flex align-center flex-wrap ga-2 trim-player-card__header">
        <div>
          <div class="text-subtitle-2">Trim with source preview</div>
          <div class="text-caption text-medium-emphasis">
            Play the original video, set trim points from the current frame, then update the
            processed preview below when needed.
          </div>
        </div>
        <v-spacer />
        <v-chip size="small" variant="tonal" color="primary">
          Clip {{ formatDurationClock(selectionDurationSeconds, { includeTenths: true }) }}
        </v-chip>
      </div>

      <div class="trim-player-stage">
        <video
          v-if="sourceUrl && canRenderVideo"
          ref="videoRef"
          class="trim-player-video"
          :src="sourceUrl"
          controls
          preload="metadata"
          playsinline
          @loadedmetadata="onLoadedMetadata"
          @play="onVideoPlay"
          @pause="onVideoPause"
          @timeupdate="onVideoTimeUpdate"
          @seeked="onVideoSeeked"
        />
        <div v-else class="trim-player-placeholder">
          {{ placeholderMessage }}
        </div>
      </div>

      <div class="d-flex align-center flex-wrap ga-2 text-caption text-medium-emphasis mt-3">
        <div>Current {{ formatDurationClock(currentTimeSeconds, { includeTenths: true }) }}</div>
        <v-spacer />
        <div>
          Selection {{ formatDurationClock(selectionStartSeconds, { includeTenths: true }) }} to
          {{ formatDurationClock(selectionEndSeconds, { includeTenths: true }) }}
        </div>
        <v-spacer />
        <div>Output frame {{ outputPreviewDisplay }}</div>
      </div>

      <div class="trim-player-actions mt-3">
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          :disabled="!canEditTrim"
          @click="setStartFromCurrentTime"
        >
          Set start
        </v-btn>
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          :disabled="!canEditTrim"
          @click="setEndFromCurrentTime"
        >
          Set end
        </v-btn>
        <v-btn
          size="small"
          :variant="isSelectionLoopActive ? 'flat' : 'tonal'"
          color="warning"
          :disabled="!canPlaySelection"
          @click="toggleSelectionLoop"
        >
          {{ isSelectionLoopActive ? "Stop loop" : "Play selection" }}
        </v-btn>
        <v-btn
          size="small"
          variant="text"
          :disabled="!canEditTrim"
          @click="resetTrimRange"
        >
          Reset trim
        </v-btn>
        <v-spacer />
        <v-btn
          size="small"
          variant="tonal"
          color="secondary"
          prepend-icon="mdi-play-circle-outline"
          :loading="motionPreviewBusy"
          :disabled="!canGenerateMotionPreviewInternal"
          @click="generateMotionPreview"
        >
          Generate motion preview
        </v-btn>
        <v-btn
          size="small"
          variant="tonal"
          color="info"
          prepend-icon="mdi-image-sync-outline"
          :loading="previewFrameBusy"
          :disabled="!canEditTrim"
          @click="syncOutputPreview"
        >
          Update output frame
        </v-btn>
      </div>

      <v-range-slider
        v-model="trimRangeModel"
        class="trim-player-slider mt-4"
        :min="0"
        :max="sliderMaxSeconds"
        :step="sliderStepSeconds"
        :disabled="!canEditTrim"
        color="primary"
        base-color="grey-darken-2"
        thumb-label
        hide-details
      >
        <template #thumb-label="{ modelValue }">
          {{
            formatDurationClock(Number(modelValue), {
              includeTenths: true,
            })
          }}
        </template>
      </v-range-slider>

      <div class="d-flex align-center text-caption text-medium-emphasis mt-2">
        <div>Start {{ formatDurationClock(selectionStartSeconds, { includeTenths: true }) }}</div>
        <v-spacer />
        <div v-if="isSelectionLoopActive" class="text-warning">
          Looping selected range
        </div>
        <div v-else-if="isVideoPlaying">
          Playing source video
        </div>
        <div v-else>
          Pause or scrub to inspect frames
        </div>
        <v-spacer />
        <div>End {{ formatDurationClock(selectionEndSeconds, { includeTenths: true }) }}</div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    sourceFile: File | null;
    isVideoSource: boolean;
    isVideoOutput: boolean;
    trimRange: [number, number];
    durationSeconds: number | null;
    outputPreviewSeconds?: number | null;
    previewFrameBusy?: boolean;
    motionPreviewBusy?: boolean;
    disabled?: boolean;
  }>(),
  {
    outputPreviewSeconds: null,
    previewFrameBusy: false,
    motionPreviewBusy: false,
    disabled: false,
  }
);

const emit = defineEmits<{
  (event: "update:trim-range", value: [number, number]): void;
  (event: "sync-output-preview", value: number): void;
  (event: "generate-motion-preview", value: number): void;
  (event: "duration-detected", value: number | null): void;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const sourceUrl = ref<string | null>(null);
const currentTimeSeconds = ref(0);
const loadedDurationSeconds = ref<number | null>(null);
const isVideoPlaying = ref(false);
const isSelectionLoopActive = ref(false);

let selectionLoopFrameId: number | null = null;

const formatDurationClock = (
  rawSeconds: number | null | undefined,
  options: { includeTenths?: boolean } = {}
) => {
  if (typeof rawSeconds !== "number" || !Number.isFinite(rawSeconds) || rawSeconds < 0) {
    return "00:00";
  }
  const includeTenths = options.includeTenths ?? false;
  const normalized = includeTenths
    ? Math.round(rawSeconds * 10) / 10
    : Math.round(rawSeconds);
  const totalSeconds = Math.floor(normalized);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secondsValue = normalized - hours * 3600 - minutes * 60;
  const minutesLabel = String(minutes).padStart(2, "0");
  const secondsLabel = includeTenths
    ? secondsValue.toFixed(1).padStart(4, "0")
    : String(Math.floor(secondsValue)).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${minutesLabel}:${secondsLabel}`;
  }
  return `${minutesLabel}:${secondsLabel}`;
};

const revokeSourceUrl = () => {
  if (sourceUrl.value) {
    URL.revokeObjectURL(sourceUrl.value);
    sourceUrl.value = null;
  }
};

const cancelSelectionLoop = () => {
  if (selectionLoopFrameId !== null && typeof window !== "undefined") {
    window.cancelAnimationFrame(selectionLoopFrameId);
  }
  selectionLoopFrameId = null;
};

const stopSelectionLoop = (pauseVideo = false) => {
  cancelSelectionLoop();
  isSelectionLoopActive.value = false;
  if (pauseVideo && videoRef.value && !videoRef.value.paused) {
    videoRef.value.pause();
  }
};

const canRenderVideo = computed(
  () => Boolean(props.sourceFile) && props.isVideoSource && props.isVideoOutput
);

const durationCapSeconds = computed(() => {
  const durationCandidate =
    typeof props.durationSeconds === "number" && Number.isFinite(props.durationSeconds)
      ? props.durationSeconds
      : loadedDurationSeconds.value;
  if (typeof durationCandidate === "number" && durationCandidate > 0) {
    return durationCandidate;
  }
  return Math.max(0.1, props.trimRange[1], 30);
});

const sliderMaxSeconds = computed(() => Math.max(0.1, durationCapSeconds.value));
const sliderStepSeconds = computed(() => (sliderMaxSeconds.value <= 30 ? 0.1 : 0.5));

const clampSeconds = (value: number) =>
  Math.min(sliderMaxSeconds.value, Math.max(0, Number.isFinite(value) ? value : 0));

const selectionStartSeconds = computed(() => clampSeconds(props.trimRange[0]));
const selectionEndSeconds = computed(() =>
  Math.max(selectionStartSeconds.value, clampSeconds(props.trimRange[1]))
);
const selectionDurationSeconds = computed(() =>
  Math.max(0, selectionEndSeconds.value - selectionStartSeconds.value)
);

const trimRangeModel = computed<[number, number]>({
  get: () => [selectionStartSeconds.value, selectionEndSeconds.value],
  set: (value) => {
    const [rawStart, rawEnd] = value;
    const nextStart = clampSeconds(Number(rawStart) || 0);
    const nextEnd = Math.max(nextStart, clampSeconds(Number(rawEnd) || nextStart));
    emit("update:trim-range", [nextStart, nextEnd]);
  },
});

const canEditTrim = computed(() => canRenderVideo.value && !props.disabled);
const canPlaySelection = computed(
  () => canEditTrim.value && selectionDurationSeconds.value > sliderStepSeconds.value
);
const canGenerateMotionPreviewInternal = computed(
  () =>
    canEditTrim.value &&
    selectionDurationSeconds.value > 0.05 &&
    !props.previewFrameBusy &&
    !props.motionPreviewBusy
);

const outputPreviewDisplay = computed(() => {
  if (typeof props.outputPreviewSeconds !== "number") {
    return "Not synced";
  }
  return formatDurationClock(props.outputPreviewSeconds, { includeTenths: true });
});

const placeholderMessage = computed(() => {
  if (!props.sourceFile) {
    return "Select a video file to trim with a live source preview.";
  }
  if (!props.isVideoSource) {
    return "Trim preview is available for video sources only.";
  }
  if (!props.isVideoOutput) {
    return "Switch to a video output format to use trim preview.";
  }
  return "Loading video preview...";
});

const getCurrentVideoTime = () => {
  const element = videoRef.value;
  if (!element) {
    return currentTimeSeconds.value;
  }
  return clampSeconds(element.currentTime);
};

const syncCurrentTimeFromVideo = () => {
  currentTimeSeconds.value = getCurrentVideoTime();
};

const seekToTime = (seconds: number) => {
  const element = videoRef.value;
  if (!element) {
    currentTimeSeconds.value = clampSeconds(seconds);
    return;
  }
  const nextTime = clampSeconds(seconds);
  if (Math.abs(element.currentTime - nextTime) < 0.01) {
    currentTimeSeconds.value = nextTime;
    return;
  }
  element.currentTime = nextTime;
  currentTimeSeconds.value = nextTime;
};

const setStartFromCurrentTime = () => {
  const nextStart = getCurrentVideoTime();
  emit("update:trim-range", [nextStart, Math.max(nextStart, selectionEndSeconds.value)]);
};

const setEndFromCurrentTime = () => {
  const nextEnd = getCurrentVideoTime();
  emit("update:trim-range", [Math.min(selectionStartSeconds.value, nextEnd), nextEnd]);
};

const resetTrimRange = () => {
  stopSelectionLoop();
  emit("update:trim-range", [0, sliderMaxSeconds.value]);
  seekToTime(0);
};

const monitorSelectionLoop = () => {
  cancelSelectionLoop();
  if (typeof window === "undefined") {
    return;
  }
  const step = () => {
    const element = videoRef.value;
    if (!element || !isSelectionLoopActive.value) {
      selectionLoopFrameId = null;
      return;
    }
    const selectionStart = selectionStartSeconds.value;
    const selectionEnd = selectionEndSeconds.value;
    if (selectionEnd - selectionStart <= sliderStepSeconds.value) {
      stopSelectionLoop(true);
      return;
    }
    if (element.currentTime < selectionStart || element.currentTime >= selectionEnd) {
      element.currentTime = selectionStart;
      currentTimeSeconds.value = selectionStart;
    }
    selectionLoopFrameId = window.requestAnimationFrame(step);
  };
  selectionLoopFrameId = window.requestAnimationFrame(step);
};

const toggleSelectionLoop = async () => {
  const element = videoRef.value;
  if (!element || !canPlaySelection.value) {
    return;
  }
  if (isSelectionLoopActive.value) {
    stopSelectionLoop(true);
    return;
  }
  const selectionStart = selectionStartSeconds.value;
  const selectionEnd = selectionEndSeconds.value;
  if (element.currentTime < selectionStart || element.currentTime >= selectionEnd) {
    element.currentTime = selectionStart;
    currentTimeSeconds.value = selectionStart;
  }
  isSelectionLoopActive.value = true;
  try {
    await element.play();
    monitorSelectionLoop();
  } catch {
    stopSelectionLoop();
  }
};

const syncOutputPreview = () => {
  emit("sync-output-preview", getCurrentVideoTime());
};

const generateMotionPreview = () => {
  emit("generate-motion-preview", getCurrentVideoTime());
};

const onLoadedMetadata = () => {
  const element = videoRef.value;
  if (!element) {
    loadedDurationSeconds.value = null;
    emit("duration-detected", null);
    return;
  }
  const nextDuration = Number.isFinite(element.duration) && element.duration > 0 ? element.duration : null;
  loadedDurationSeconds.value = nextDuration;
  emit("duration-detected", nextDuration);
  syncCurrentTimeFromVideo();

  if (nextDuration !== null) {
    const clampedStart = Math.min(nextDuration, selectionStartSeconds.value);
    const clampedEnd = Math.min(nextDuration, Math.max(clampedStart, selectionEndSeconds.value));
    if (
      Math.abs(clampedStart - props.trimRange[0]) > 0.001 ||
      Math.abs(clampedEnd - props.trimRange[1]) > 0.001
    ) {
      emit("update:trim-range", [clampedStart, clampedEnd]);
    }
  }
};

const onVideoPlay = () => {
  isVideoPlaying.value = true;
  if (isSelectionLoopActive.value) {
    monitorSelectionLoop();
  }
};

const onVideoPause = () => {
  isVideoPlaying.value = false;
  cancelSelectionLoop();
  isSelectionLoopActive.value = false;
  syncCurrentTimeFromVideo();
};

const onVideoTimeUpdate = () => {
  syncCurrentTimeFromVideo();
};

const onVideoSeeked = () => {
  syncCurrentTimeFromVideo();
};

watch(
  [() => props.sourceFile, () => props.isVideoSource, () => props.isVideoOutput],
  ([file, isVideoSource, isVideoOutput]) => {
    stopSelectionLoop();
    isVideoPlaying.value = false;
    loadedDurationSeconds.value = null;
    currentTimeSeconds.value = 0;
    emit("duration-detected", null);
    revokeSourceUrl();
    if (file && isVideoSource && isVideoOutput) {
      sourceUrl.value = URL.createObjectURL(file);
    }
  },
  { immediate: true }
);

watch(
  () => props.trimRange,
  () => {
    if (!isSelectionLoopActive.value || selectionDurationSeconds.value > sliderStepSeconds.value) {
      return;
    }
    stopSelectionLoop(true);
  }
);

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) {
      stopSelectionLoop(true);
    }
  }
);

onBeforeUnmount(() => {
  stopSelectionLoop();
  revokeSourceUrl();
});
</script>

<style scoped>
.trim-player-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.trim-player-card--inactive {
  background: rgba(var(--v-theme-surface), 0.32);
}

.trim-player-card__body {
  padding: 14px !important;
}

.trim-player-card__header {
  row-gap: 8px;
}

.trim-player-stage {
  position: relative;
  min-height: 252px;
  margin-top: 14px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background:
    radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.18), transparent 32%),
    linear-gradient(145deg, #081019 0%, #101d2d 48%, #16263a 100%);
}

.trim-player-video {
  display: block;
  width: 100%;
  max-height: 420px;
  background: #000;
}

.trim-player-placeholder {
  min-height: 252px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.76);
}

.trim-player-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.trim-player-slider {
  margin-bottom: -2px;
}

.trim-player-slider :deep(.v-slider-track__container) {
  height: 6px;
}

.trim-player-slider :deep(.v-slider-thumb__surface) {
  width: 16px;
  height: 16px;
}
</style>
