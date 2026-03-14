<template>
  <v-card
    variant="tonal"
    class="trim-player-card"
    :class="{ 'trim-player-card--inactive': !canRenderVideo }"
  >
    <v-card-text class="trim-player-card__body">
      <div class="d-flex align-center flex-wrap ga-2 trim-player-card__header">
        <div>
          <div class="text-subtitle-2">Source media</div>
          <div class="text-caption text-medium-emphasis">
            Preview the original file and set trim points before converting.
          </div>
        </div>
        <v-spacer />
        <v-btn
          v-if="showHeaderSourceSelectAction"
          size="small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-tray-arrow-up"
          @click="openSourceFilePicker"
        >
          Choose another file
        </v-btn>
        <v-chip v-if="isUsingPreviewProxy" size="small" variant="tonal" color="info">
          Using browser preview
        </v-chip>
      </div>

      <div
        class="trim-player-stage"
        :class="{
          'trim-player-stage--drop-active': isStageDragActive,
          'trim-player-stage--selectable': canSelectSourceFile && !canRenderVideo,
        }"
        @dragenter.prevent="onStageDragEnter"
        @dragover.prevent="onStageDragOver"
        @dragleave.prevent="onStageDragLeave"
        @drop.prevent="onStageDrop"
      >
        <video
          v-if="activeVideoUrl && canRenderVideo"
          ref="videoRef"
          class="trim-player-video"
          :src="activeVideoUrl"
          controls
          preload="metadata"
          playsinline
          @loadedmetadata="onLoadedMetadata"
          @play="onVideoPlay"
          @pause="onVideoPause"
          @timeupdate="onVideoTimeUpdate"
          @seeked="onVideoSeeked"
          @error="onVideoError"
        />
        <div
          v-else
          class="trim-player-placeholder"
          :class="{ 'trim-player-placeholder--selectable': canSelectSourceFile }"
          :role="canSelectSourceFile ? 'button' : undefined"
          :tabindex="canSelectSourceFile ? 0 : undefined"
          @click="onPlaceholderClick"
          @keydown.enter.prevent="openSourceFilePicker"
          @keydown.space.prevent="openSourceFilePicker"
        >
          <div class="trim-player-placeholder-copy">
            <div class="text-body-2 font-weight-medium">
              {{ fallbackTitle }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ fallbackDescription }}
            </div>
            <div v-if="fallbackErrorMessage" class="text-caption text-warning mt-2">
              {{ fallbackErrorMessage }}
            </div>
          </div>
          <div class="trim-player-placeholder-actions mt-4">
            <v-btn
              v-if="showSourceSelectAction"
              size="small"
              variant="flat"
              color="primary"
              prepend-icon="mdi-tray-arrow-up"
              :disabled="!canSelectSourceFile"
              @click.stop="openSourceFilePicker"
            >
              Choose source media
            </v-btn>
            <v-btn
              v-if="showGeneratePreviewProxyAction"
              size="small"
              variant="tonal"
              color="secondary"
              prepend-icon="mdi-video-outline"
              :loading="sourceProxyBusy"
              :disabled="!canRequestPlayablePreview"
              @click.stop="requestPlayablePreview"
            >
              Create browser preview
            </v-btn>
          </div>
        </div>

        <div v-if="isStageDragActive" class="trim-player-drop-overlay">
          Drop source media here
        </div>
      </div>

      <input
        ref="sourceFileInputRef"
        class="trim-player-source-input"
        type="file"
        :accept="sourceFileAccept"
        tabindex="-1"
        @change="onSourceFileInputChange"
      />

      <div
        v-if="props.sourceFile"
        class="d-flex align-center flex-wrap ga-2 text-caption text-medium-emphasis mt-3"
      >
        <div>Current {{ formatDurationClock(currentTimeSeconds, { includeTenths: true }) }}</div>
        <v-spacer />
        <v-chip size="small" variant="tonal" color="primary">
          Output duration {{ formatDurationClock(selectionDurationSeconds, { includeTenths: true }) }}
        </v-chip>
      </div>

      <div class="trim-player-actions mt-3">
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          :disabled="!canAdjustTrimFromReference"
          @click="setStartFromCurrentTime"
        >
          Set start
        </v-btn>
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          :disabled="!canAdjustTrimFromReference"
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
          :disabled="!canTrimSource"
          @click="resetTrimRange"
        >
          Reset trim
        </v-btn>
      </div>

      <v-range-slider
        v-model="trimRangeModel"
        class="trim-player-slider mt-4"
        :min="0"
        :max="sliderMaxSeconds"
        :step="sliderStepSeconds"
        :disabled="!canTrimRangeEdit"
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

      <v-slider
        v-if="showReferenceTimeSlider"
        v-model="referenceTimeModel"
        class="trim-player-reference-slider mt-2"
        :min="0"
        :max="sliderMaxSeconds"
        :step="sliderStepSeconds"
        :disabled="!canPositionReferenceTime"
        color="info"
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
      </v-slider>

      <div class="text-caption text-medium-emphasis mt-2">
        <div v-if="isSelectionLoopActive" class="text-warning">
          Looping selected range
        </div>
        <div v-else-if="hasScrubbablePlayback && isVideoPlaying">
          Playing source video
        </div>
        <div v-else-if="showReferenceTimeSlider">
          Reference time {{ formatDurationClock(currentTimeSeconds, { includeTenths: true }) }}
        </div>
        <div v-else-if="canTrimSource && !hasKnownDuration">
          Duration unavailable. Use manual start/end fields.
        </div>
        <div v-else>
          Pause or scrub to inspect frames
        </div>
      </div>

      <div v-if="isVideoOutput" class="trim-player-manual-fields mt-3">
        <div class="text-caption text-medium-emphasis trim-player-manual-fields__copy">
          Fine-tune trim times directly here if you need exact start or end values.
        </div>
        <v-row density="comfortable" class="mt-1">
          <v-col cols="12" sm="6">
            <v-text-field
              :model-value="startTimeInput"
              label="Start time"
              placeholder="hh:mm:ss or seconds"
              density="compact"
              hide-details="auto"
              :disabled="disabled"
              :error="startTimeInputInvalid"
              :error-messages="
                startTimeInputInvalid ? 'Use hh:mm:ss (or seconds).' : undefined
              "
              @update:model-value="onStartTimeInputUpdate"
              @blur="commitStartTimeInput"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              :model-value="endTimeInput"
              label="End time"
              placeholder="hh:mm:ss or seconds"
              density="compact"
              hide-details="auto"
              :disabled="disabled"
              :error="endTimeInputInvalid"
              :error-messages="
                endTimeInputInvalid ? 'Use hh:mm:ss (or seconds).' : undefined
              "
              @update:model-value="onEndTimeInputUpdate"
              @blur="commitEndTimeInput"
            />
          </v-col>
        </v-row>
      </div>

      <div v-if="slots.footer" class="trim-player-footer mt-3">
        <slot name="footer" />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useSlots, watch } from "vue";

type PlaybackState = "idle" | "loading" | "ready" | "failed";

const props = withDefaults(
  defineProps<{
    sourceFile: File | null;
    sourceProxyUrl?: string | null;
    sourceProxyBusy?: boolean;
    sourceProxyError?: string | null;
    isVideoSource: boolean;
    isVideoOutput: boolean;
    trimRange: [number, number];
    durationSeconds: number | null;
    previewFrameBusy?: boolean;
    motionPreviewBusy?: boolean;
    startTimeInput?: string;
    endTimeInput?: string;
    startTimeInputInvalid?: boolean;
    endTimeInputInvalid?: boolean;
    disabled?: boolean;
  }>(),
  {
    sourceProxyUrl: null,
    sourceProxyBusy: false,
    sourceProxyError: null,
    previewFrameBusy: false,
    motionPreviewBusy: false,
    startTimeInput: "",
    endTimeInput: "",
    startTimeInputInvalid: false,
    endTimeInputInvalid: false,
    disabled: false,
  }
);

const emit = defineEmits<{
  (event: "update:trim-range", value: [number, number]): void;
  (event: "request-playable-preview"): void;
  (event: "duration-detected", value: number | null): void;
  (event: "current-time-update", value: number): void;
  (event: "preview-time-request", value: number): void;
  (event: "select-source-file", value: File): void;
  (event: "update:start-time-input", value: string): void;
  (event: "update:end-time-input", value: string): void;
  (event: "commit-start-time-input"): void;
  (event: "commit-end-time-input"): void;
}>();

const slots = useSlots();

const videoRef = ref<HTMLVideoElement | null>(null);
const sourceFileInputRef = ref<HTMLInputElement | null>(null);
const sourceUrl = ref<string | null>(null);
const currentTimeSeconds = ref(0);
const loadedDurationSeconds = ref<number | null>(null);
const isVideoPlaying = ref(false);
const isSelectionLoopActive = ref(false);
const nativePlaybackState = ref<PlaybackState>("idle");
const nativePlaybackError = ref<string | null>(null);
const proxyPlaybackState = ref<PlaybackState>("idle");
const proxyPlaybackError = ref<string | null>(null);
const isStageDragActive = ref(false);

const sourceFileAccept = "video/*,audio/*,.mjpeg,.mjpg,.avi,.mov,.mkv,.mp4,.webm";

let selectionLoopFrameId: number | null = null;
let dragDepth = 0;

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

const isUsingPreviewProxy = computed(() => Boolean(props.sourceProxyUrl));

const activeVideoUrl = computed(() => {
  if (!canRenderVideo.value) {
    return null;
  }
  if (props.sourceProxyUrl) {
    if (proxyPlaybackState.value === "failed") {
      return null;
    }
    return props.sourceProxyUrl;
  }
  if (nativePlaybackState.value === "failed") {
    return null;
  }
  return sourceUrl.value;
});

const activePlaybackState = computed(() =>
  isUsingPreviewProxy.value ? proxyPlaybackState.value : nativePlaybackState.value
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

const hasKnownDuration = computed(
  () =>
    (typeof props.durationSeconds === "number" && Number.isFinite(props.durationSeconds) && props.durationSeconds > 0) ||
    (typeof loadedDurationSeconds.value === "number" &&
      Number.isFinite(loadedDurationSeconds.value) &&
      loadedDurationSeconds.value > 0)
);

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
    const startChanged = Math.abs(nextStart - selectionStartSeconds.value) > 0.001;
    const endChanged = Math.abs(nextEnd - selectionEndSeconds.value) > 0.001;
    emit("update:trim-range", [nextStart, nextEnd]);
    if (startChanged || endChanged) {
      const previewTime =
        endChanged && !startChanged
          ? nextEnd
          : startChanged && !endChanged
            ? nextStart
            : Math.abs(nextEnd - selectionEndSeconds.value) >=
                Math.abs(nextStart - selectionStartSeconds.value)
              ? nextEnd
              : nextStart;
      emit("preview-time-request", previewTime);
    }
  },
});

const canTrimSource = computed(() => canRenderVideo.value && !props.disabled);
const canSelectSourceFile = computed(
  () => !props.disabled && !props.previewFrameBusy && !props.sourceProxyBusy && !props.motionPreviewBusy
);
const hasScrubbablePlayback = computed(
  () => Boolean(activeVideoUrl.value) && activePlaybackState.value === "ready"
);
const canTrimRangeEdit = computed(() => canTrimSource.value && hasKnownDuration.value);
const canPositionReferenceTime = computed(() => canTrimSource.value && hasKnownDuration.value);
const canAdjustTrimFromReference = computed(
  () => canTrimSource.value && (hasScrubbablePlayback.value || canPositionReferenceTime.value)
);
const canPlaySelection = computed(
  () =>
    hasScrubbablePlayback.value &&
    selectionDurationSeconds.value > sliderStepSeconds.value
);
const canRequestPlayablePreview = computed(
  () => canTrimSource.value && !props.sourceProxyBusy && !props.previewFrameBusy && !props.motionPreviewBusy
);
const showGeneratePreviewProxyAction = computed(
  () =>
    canTrimSource.value &&
    ((isUsingPreviewProxy.value && proxyPlaybackState.value === "failed") ||
      (!isUsingPreviewProxy.value && nativePlaybackState.value === "failed"))
);
const showReferenceTimeSlider = computed(
  () => canTrimSource.value && !hasScrubbablePlayback.value && hasKnownDuration.value
);
const showHeaderSourceSelectAction = computed(
  () => Boolean(props.sourceFile) && canSelectSourceFile.value
);
const showSourceSelectAction = computed(() => canSelectSourceFile.value && !canRenderVideo.value);

const fallbackErrorMessage = computed(() => {
  if (isUsingPreviewProxy.value) {
    return proxyPlaybackError.value ?? props.sourceProxyError;
  }
  return nativePlaybackError.value ?? props.sourceProxyError;
});

const fallbackTitle = computed(() => {
  if (!props.sourceFile) {
    return "Drop source media here.";
  }
  if (!props.isVideoSource) {
    return "No visual preview is available for this file.";
  }
  if (!props.isVideoOutput) {
    return "Switch to a video output to preview and trim here.";
  }
  if (isUsingPreviewProxy.value) {
    return "Browser preview unavailable.";
  }
  if (nativePlaybackState.value === "failed") {
    return "This file cannot be previewed directly in your browser.";
  }
  return "Loading source preview...";
});

const fallbackDescription = computed(() => {
  if (!props.sourceFile) {
    return "Drag and drop or click to choose a video or audio file.";
  }
  if (!props.isVideoSource) {
    return "Choose a video file if you want to trim with a visual preview, or continue with audio conversion.";
  }
  if (!props.isVideoOutput) {
    return "Switch the output back to video if you want to trim against a visual preview.";
  }
  if (isUsingPreviewProxy.value) {
    return "The browser preview could not be played. You can still trim by time below.";
  }
  if (nativePlaybackState.value === "failed") {
    return "Create a browser preview to scrub the timeline, or continue with manual trim times.";
  }
  return "Preparing source preview...";
});

const resetStageDragState = () => {
  dragDepth = 0;
  isStageDragActive.value = false;
};

const emitSelectedSourceFile = (file: File | null) => {
  if (!file) {
    return;
  }
  emit("select-source-file", file);
  if (sourceFileInputRef.value) {
    sourceFileInputRef.value.value = "";
  }
};

const openSourceFilePicker = () => {
  if (!canSelectSourceFile.value) {
    return;
  }
  sourceFileInputRef.value?.click();
};

const onPlaceholderClick = () => {
  if (!canSelectSourceFile.value) {
    return;
  }
  openSourceFilePicker();
};

const onSourceFileInputChange = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  emitSelectedSourceFile(input?.files?.[0] ?? null);
};

const eventIncludesFiles = (event: DragEvent) =>
  Array.from(event.dataTransfer?.types ?? []).includes("Files");

const onStageDragEnter = (event: DragEvent) => {
  if (!canSelectSourceFile.value || !eventIncludesFiles(event)) {
    return;
  }
  dragDepth += 1;
  isStageDragActive.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
};

const onStageDragOver = (event: DragEvent) => {
  if (!canSelectSourceFile.value || !eventIncludesFiles(event)) {
    return;
  }
  isStageDragActive.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
};

const onStageDragLeave = (event: DragEvent) => {
  if (!eventIncludesFiles(event)) {
    return;
  }
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) {
    isStageDragActive.value = false;
  }
};

const onStageDrop = (event: DragEvent) => {
  if (!canSelectSourceFile.value || !eventIncludesFiles(event)) {
    resetStageDragState();
    return;
  }
  const file = event.dataTransfer?.files?.[0] ?? null;
  resetStageDragState();
  emitSelectedSourceFile(file);
};

const referenceTimeModel = computed<number>({
  get: () => clampSeconds(currentTimeSeconds.value),
  set: (value) => {
    currentTimeSeconds.value = clampSeconds(Number(value));
    emit("preview-time-request", currentTimeSeconds.value);
  },
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
  emit("preview-time-request", nextStart);
};

const setEndFromCurrentTime = () => {
  const nextEnd = getCurrentVideoTime();
  emit("update:trim-range", [Math.min(selectionStartSeconds.value, nextEnd), nextEnd]);
  emit("preview-time-request", nextEnd);
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

const requestPlayablePreview = () => {
  emit("request-playable-preview");
};

const onStartTimeInputUpdate = (value: string | null) => {
  emit("update:start-time-input", value ?? "");
};

const onEndTimeInputUpdate = (value: string | null) => {
  emit("update:end-time-input", value ?? "");
};

const commitStartTimeInput = () => {
  emit("commit-start-time-input");
};

const commitEndTimeInput = () => {
  emit("commit-end-time-input");
};

const onLoadedMetadata = () => {
  const element = videoRef.value;
  if (!element) {
    loadedDurationSeconds.value = null;
    emit("duration-detected", null);
    return;
  }
  if (isUsingPreviewProxy.value) {
    proxyPlaybackState.value = "ready";
    proxyPlaybackError.value = null;
  } else {
    nativePlaybackState.value = "ready";
    nativePlaybackError.value = null;
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

const onVideoError = () => {
  stopSelectionLoop(true);
  isVideoPlaying.value = false;
  loadedDurationSeconds.value = null;
  emit("duration-detected", null);
  if (isUsingPreviewProxy.value) {
    proxyPlaybackState.value = "failed";
    proxyPlaybackError.value = "The browser preview could not be played.";
    return;
  }
  nativePlaybackState.value = "failed";
  nativePlaybackError.value = "This file format cannot be previewed directly in your browser.";
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
  emit("preview-time-request", currentTimeSeconds.value);
};

const onVideoTimeUpdate = () => {
  syncCurrentTimeFromVideo();
};

const onVideoSeeked = () => {
  syncCurrentTimeFromVideo();
  emit("preview-time-request", currentTimeSeconds.value);
};

watch(
  [() => props.sourceFile, () => props.isVideoSource, () => props.isVideoOutput],
  ([file, isVideoSource, isVideoOutput]) => {
    resetStageDragState();
    stopSelectionLoop();
    isVideoPlaying.value = false;
    loadedDurationSeconds.value = null;
    currentTimeSeconds.value = 0;
    emit("duration-detected", null);
    nativePlaybackState.value = file && isVideoSource && isVideoOutput ? "loading" : "idle";
    nativePlaybackError.value = null;
    proxyPlaybackState.value = "idle";
    proxyPlaybackError.value = null;
    revokeSourceUrl();
    if (file && isVideoSource && isVideoOutput) {
      sourceUrl.value = URL.createObjectURL(file);
    }
  },
  { immediate: true }
);

watch(
  () => props.sourceProxyUrl,
  (url) => {
    stopSelectionLoop();
    isVideoPlaying.value = false;
    if (!url) {
      proxyPlaybackState.value = "idle";
      proxyPlaybackError.value = null;
      return;
    }
    proxyPlaybackState.value = "loading";
    proxyPlaybackError.value = null;
  }
);

watch(
  () => props.sourceProxyBusy,
  (busy) => {
    if (busy) {
      stopSelectionLoop(true);
    }
  }
);

watch(
  () => currentTimeSeconds.value,
  (seconds) => {
    emit("current-time-update", seconds);
  },
  { immediate: true }
);

watch(
  () => sliderMaxSeconds.value,
  () => {
    currentTimeSeconds.value = clampSeconds(currentTimeSeconds.value);
  }
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

.trim-player-stage--selectable {
  cursor: copy;
}

.trim-player-stage--drop-active {
  border-color: rgba(var(--v-theme-primary), 0.72);
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.4);
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.76);
}

.trim-player-placeholder--selectable {
  cursor: pointer;
}

.trim-player-placeholder-copy {
  max-width: 520px;
}

.trim-player-placeholder-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.trim-player-drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 10, 18, 0.72);
  color: rgba(255, 255, 255, 0.96);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  pointer-events: none;
}

.trim-player-source-input {
  display: none;
}

.trim-player-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.trim-player-manual-fields {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-top: 12px;
}

.trim-player-manual-fields__copy {
  line-height: 1.25;
}

.trim-player-footer {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-top: 12px;
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

.trim-player-reference-slider :deep(.v-slider-track__container) {
  height: 4px;
}

.trim-player-reference-slider :deep(.v-slider-thumb__surface) {
  width: 14px;
  height: 14px;
}
</style>
