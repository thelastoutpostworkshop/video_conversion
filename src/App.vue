<template>
  <v-app>
    <v-navigation-drawer
      v-model="drawerOpen"
      :temporary="mdAndDown"
      :permanent="!mdAndDown"
      width="280"
      class="app-navigation"
    >
      <div class="pa-4">
        <div class="text-overline text-medium-emphasis">Navigation</div>
        <v-list nav density="comfortable" class="mt-2">
          <v-list-item
            v-for="item in navigationItems"
            :key="item.id"
            :prepend-icon="item.icon"
            :title="item.title"
            :active="activeNavigation === item.id"
            color="primary"
            rounded="lg"
            @click="navigateToSection(item.id)"
          />
        </v-list>
      </div>

      <template #append>
        <div class="pa-4">
          <v-divider class="mb-4" />
          <div class="resources-title text-medium-emphasis mb-2">Resources</div>
          <v-list nav density="comfortable" class="resources-list">
            <v-list-item
              v-for="resource in resourceLinks"
              :key="resource.title"
              :prepend-icon="resource.icon"
              :title="resource.title"
              :href="resource.href"
              target="_blank"
              rel="noopener noreferrer"
              rounded="lg"
            />
          </v-list>
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar class="app-bar" flat>
      <v-app-bar-nav-icon @click="drawerOpen = !drawerOpen" />
      <v-toolbar-title class="font-weight-medium">
        Video Conversion Studio
      </v-toolbar-title>
      <v-spacer />
      <v-btn
        :icon="themeToggleIcon"
        variant="text"
        :aria-label="themeToggleLabel"
        :title="themeToggleLabel"
        @click="toggleTheme"
      />
      <v-chip
        v-if="!mdAndDown"
        :color="ffmpegStatusColor"
        variant="tonal"
        size="small"
        prepend-icon="mdi-memory"
      >
        {{ ffmpegStatusText }}
      </v-chip>
    </v-app-bar>

    <v-main class="app-main">
      <v-container class="py-6">
        <v-row justify="center">
          <v-col cols="12" xl="10">
            <v-card v-if="activeView === 'workspace'" rounded="lg" elevation="4" class="panel-card">
              <v-card-title class="d-flex align-center flex-wrap ga-3">
                <div>
                  <div class="text-h6">Conversion workspace</div>
                  <div class="text-caption text-medium-emphasis">
                    Board, source, settings, and export in one flow.
                  </div>
                </div>
              </v-card-title>

              <v-divider />

              <v-card-text>
                <div id="section-target" class="app-nav-target" />
                <div class="step-heading mb-2">
                  <div class="text-subtitle-1 font-weight-medium">
                    1. Choose development board
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    Select a board preset or custom target size before configuring conversion details.
                  </div>
                </div>

                <v-row v-if="isVideoOutput" dense class="section-target-grid">
                  <v-col cols="12" sm="6" md="3">
                    <v-select
                      v-model="targetSetupMode"
                      :items="targetSetupModeItems"
                      item-title="title"
                      item-value="value"
                      label="Target setup"
                      density="compact"
                      hide-details="auto"
                      :disabled="processing"
                    />
                  </v-col>
                  <v-col cols="12" sm="6" md="5">
                    <v-select
                      v-if="targetSetupMode === 'preset'"
                      v-model="selectedBoardPresetId"
                      :items="boardPresetItems"
                      item-title="title"
                      item-value="value"
                      label="Development board"
                      density="compact"
                      hide-details="auto"
                      :disabled="processing"
                    />
                    <v-sheet
                      v-else
                      rounded="lg"
                      border
                      class="d-flex align-center h-100 px-3 py-2 target-custom-hint"
                    >
                      <div class="text-caption text-medium-emphasis">
                        Custom target selected. Choose the screen dimensions below.
                      </div>
                    </v-sheet>
                  </v-col>
                  <v-col cols="6" md="2">
                    <v-text-field
                      :model-value="width"
                      label="Screen width"
                      type="number"
                      density="compact"
                      hide-details="auto"
                      :readonly="targetSetupMode === 'preset'"
                      :disabled="processing"
                      @update:model-value="(value) => (width = toPositiveNullable(value))"
                    />
                  </v-col>
                  <v-col cols="6" md="2">
                    <v-text-field
                      :model-value="height"
                      label="Screen height"
                      type="number"
                      density="compact"
                      hide-details="auto"
                      :readonly="targetSetupMode === 'preset'"
                      :disabled="processing"
                      @update:model-value="(value) => (height = toPositiveNullable(value))"
                    />
                  </v-col>
                  <v-col cols="12" v-if="targetSetupMode === 'preset' && selectedBoardPresetDetails">
                    <div class="text-caption text-info target-preset-note">
                      {{ selectedBoardPresetDetails }}
                    </div>
                  </v-col>
                </v-row>
                <v-alert v-else type="info" variant="tonal" class="mt-2">
                  Development board presets are available for video output formats.
                </v-alert>

                <v-divider class="my-4" />
                <div id="section-source" class="app-nav-target" />
                <div class="step-heading mb-2">
                  <div class="text-subtitle-1 font-weight-medium">
                    2. Choose source media
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    Select the video to convert, then confirm output format and preview metadata.
                  </div>
                </div>

                <v-row dense>
                  <v-col cols="12" md="8">
                    <SourceFileInput
                      v-model="sourceFile"
                      :disabled="processing || previewFrameBusy"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-select
                      v-model="outputFormat"
                      :items="formatItems"
                      item-title="title"
                      item-value="value"
                      label="Output format"
                      density="comfortable"
                      :disabled="processing || previewFrameBusy"
                    />
                  </v-col>
                </v-row>

                <v-row dense class="mt-2">
                  <v-col cols="12" md="8">
                    <v-card
                      variant="tonal"
                      class="preview-time-card"
                      :class="{ 'preview-time-card--inactive': !hasPreviewSource }"
                    >
                      <v-card-text class="py-3">
                        <div class="d-flex align-center mb-2">
                          <div class="d-flex align-center ga-2">
                            <div class="text-subtitle-2">Preview frame position</div>
                            <div
                              v-if="previewFrameBusy"
                              class="text-caption text-info preview-generation-status"
                            >
                              Generating frame preview...
                            </div>
                          </div>
                          <v-spacer />
                          <div class="text-caption text-medium-emphasis">
                            {{ previewSecondDisplay }}
                          </div>
                        </div>
                        <v-slider
                          v-model="previewSecondModel"
                          class="preview-position-slider"
                          :class="{ 'preview-position-slider--inactive': !hasPreviewSource }"
                          :min="previewSecondMin"
                          :max="previewSecondMax"
                          :step="previewSecondsStep"
                          :disabled="isPreviewSliderDisabled"
                          :color="previewSliderColor"
                          base-color="grey-darken-3"
                          thumb-label
                          hide-details
                        >
                          <template #thumb-label="{ modelValue }">
                            {{ formatDurationClock(Number(modelValue), { includeTenths: true }) }}
                          </template>
                        </v-slider>
                      </v-card-text>
                    </v-card>

                    <div class="mt-2">
                    <PreviewFrameSurface
                      :preview-frame-url="previewFrameUrl"
                      :preview-frame-busy="previewFrameBusy"
                      :has-source-file="Boolean(sourceFile)"
                      :is-video-source="isVideoSource"
                      :is-video-output="isVideoOutput"
                      :target-width="previewTargetDimensions?.width ?? null"
                      :target-height="previewTargetDimensions?.height ?? null"
                    />
                    </div>
                  </v-col>
                  <v-col cols="12" md="4" class="d-flex flex-column ga-3">
                    <v-sheet class="source-metadata-inline px-3 py-2" rounded="lg" border>
                      <div class="d-flex align-center ga-2">
                        <v-icon icon="mdi-information-outline" size="16" />
                        <div class="text-caption text-medium-emphasis">Source metadata</div>
                        <v-spacer />
                        <div class="text-caption">{{ sourceMetadataLabel }}</div>
                      </div>
                      <v-progress-linear
                        v-if="sourceMetadataLoading"
                        indeterminate
                        height="3"
                        class="mt-2"
                      />
                      <div v-if="sourceMetadataError" class="text-caption text-warning mt-2">
                        {{ sourceMetadataError }}
                      </div>
                    </v-sheet>

                    <v-card variant="tonal" class="settings-side-card">
                      <v-card-text class="py-3">
                        <div class="step-heading mb-2">
                          <div class="text-subtitle-1 font-weight-medium">
                            3. Adjust conversion settings
                          </div>
                          <div class="text-caption text-medium-emphasis">
                            Tune size, orientation, quality, and trimming before conversion.
                          </div>
                        </div>

                        <v-row v-if="isVideoOutput" dense>
                          <v-col cols="12">
                            <v-select
                              v-model="orientation"
                              :items="orientationItems"
                              item-title="title"
                              item-value="value"
                              label="Orientation"
                              density="comfortable"
                              :disabled="processing"
                            />
                          </v-col>
                          <v-col cols="12">
                            <v-select
                              v-model="scaleMode"
                              :items="scaleModeItems"
                              item-title="title"
                              item-value="value"
                              label="Scale mode"
                              density="comfortable"
                              :disabled="processing || outputSizeMode !== 'custom'"
                            />
                          </v-col>

                          <v-col cols="12" sm="6">
                            <v-text-field
                              :model-value="fps"
                              label="FPS"
                              type="number"
                              density="comfortable"
                              :disabled="processing"
                              @update:model-value="(value) => (fps = toNullableNumber(value))"
                            />
                          </v-col>
                          <v-col cols="12" sm="6">
                            <v-text-field
                              :model-value="quality"
                              label="Quality"
                              type="number"
                              density="comfortable"
                              :disabled="processing"
                              hint="1 is highest quality"
                              persistent-hint
                              @update:model-value="(value) => (quality = toNullableNumber(value))"
                            />
                          </v-col>
                          <v-col cols="12">
                            <div class="text-caption text-medium-emphasis mb-2">
                              {{ trimInputHelpText }}
                            </div>
                          </v-col>
                          <v-col cols="12">
                            <v-range-slider
                              v-model="trimRangeModel"
                              @start="onTrimRangeDragStart"
                              @end="onTrimRangeDragEnd"
                              :min="0"
                              :max="trimRangeMax"
                              :step="previewSecondsStep"
                              :disabled="processing || !isTrimSliderAvailable"
                              color="primary"
                              base-color="grey-darken-3"
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
                            <div class="d-flex align-center text-caption text-medium-emphasis mt-1">
                              <div>Start {{ trimRangeDisplayStart }}</div>
                              <v-spacer />
                              <div>End {{ trimRangeDisplayEnd }}</div>
                            </div>
                            <div
                              v-if="!isTrimSliderAvailable"
                              class="text-caption text-medium-emphasis mt-1"
                            >
                              Trim slider is available when source duration metadata is known.
                            </div>
                          </v-col>
                          <v-col cols="12">
                            <v-text-field
                              v-model="startTimeInput"
                              label="Start time"
                              placeholder="hh:mm:ss or seconds"
                              density="comfortable"
                              :disabled="processing"
                              :error="startTimeInputInvalid"
                              :error-messages="
                                startTimeInputInvalid ? 'Use hh:mm:ss (or seconds).' : undefined
                              "
                              @blur="commitStartTimeInput"
                            />
                          </v-col>
                          <v-col cols="12">
                            <v-text-field
                              v-model="endTimeInput"
                              label="End time"
                              placeholder="hh:mm:ss or seconds"
                              density="comfortable"
                              :disabled="processing"
                              :error="endTimeInputInvalid"
                              :error-messages="
                                endTimeInputInvalid ? 'Use hh:mm:ss (or seconds).' : undefined
                              "
                              @blur="commitEndTimeInput"
                            />
                          </v-col>
                        </v-row>

                        <v-row v-else dense>
                          <v-col cols="12">
                            <v-text-field
                              :model-value="mp3Bitrate"
                              label="MP3 bitrate (kbps)"
                              type="number"
                              density="comfortable"
                              :disabled="processing"
                              @update:model-value="
                                (value) => (mp3Bitrate = toPositiveNullable(value))
                              "
                            />
                          </v-col>
                        </v-row>

                        <v-alert
                          v-if="hasTrimInputError || hasRangeError"
                          type="warning"
                          variant="tonal"
                          class="mt-2"
                        >
                          {{ trimValidationMessage }}
                        </v-alert>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>

                <v-divider class="my-4" />
                <div id="section-export" class="app-nav-target" />
                <div class="step-heading mb-2">
                  <div class="text-subtitle-1 font-weight-medium">
                    4. Convert and download
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    Launch conversion, monitor progress, and download the output file.
                  </div>
                </div>

                <v-row dense>
                  <v-col cols="12" md="8">
                    <v-text-field
                      v-model="outputFileName"
                      label="Output file name"
                      density="comfortable"
                      :disabled="processing"
                    />
                  </v-col>
                  <v-col cols="12" md="4" class="d-flex align-center justify-end">
                    <v-btn
                      color="error"
                      variant="tonal"
                      :disabled="!processing"
                      @click="cancelConversion"
                    >
                      Cancel
                    </v-btn>
                  </v-col>
                </v-row>

                <div class="d-flex flex-wrap ga-2">
                  <v-btn
                    color="primary"
                    :loading="processing"
                    :disabled="!canConvert"
                    @click="runConversion"
                  >
                    {{ processing ? "Converting..." : "Convert" }}
                  </v-btn>
                  <v-btn
                    color="success"
                    :disabled="!hasOutput"
                    @click="downloadOutput"
                  >
                    Download output
                  </v-btn>
                </div>

                <v-progress-linear
                  v-if="processing"
                  :model-value="processingProgress"
                  height="6"
                  class="mt-4"
                  color="primary"
                />
                <div v-if="processing" class="text-caption text-medium-emphasis mt-1">
                  Progress: {{ processingProgress }}%
                </div>

                <v-alert
                  v-if="processingError"
                  type="error"
                  variant="tonal"
                  class="mt-3"
                >
                  {{ processingError }}
                </v-alert>
                <v-alert
                  v-if="previewFrameError"
                  type="warning"
                  variant="tonal"
                  class="mt-3"
                >
                  {{ previewFrameError }}
                </v-alert>
              </v-card-text>
            </v-card>
            <v-card v-else rounded="lg" elevation="4" class="panel-card logs-view-card">
              <v-card-title class="d-flex align-center">
                <div class="text-h6">FFmpeg logs</div>
                <v-spacer />
                <v-btn
                  size="small"
                  variant="text"
                  :disabled="logLines.length === 0"
                  @click="clearLogs"
                >
                  Clear
                </v-btn>
              </v-card-title>
              <v-divider />
              <v-card-text>
                <v-textarea
                  :model-value="logsText"
                  readonly
                  auto-grow
                  rows="14"
                  variant="outlined"
                  class="log-output logs-view-output"
                />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useDisplay, useTheme } from "vuetify";
import PreviewFrameSurface from "@/components/PreviewFrameSurface.vue";
import SourceFileInput from "@/components/SourceFileInput.vue";
import type {
  AudioTranscodeOptions,
  MediaLogCallback,
  MediaProgressCallback,
  VideoOrientation,
  VideoScaleMode,
  VideoTranscodeOptions,
} from "@/services/MediaProcessingService";
import { mediaProcessingService } from "@/services/mediaProcessingServiceInstance";
import { usePreviewFrame } from "@/composables/usePreviewFrame";
import { useSourceMedia } from "@/composables/useSourceMedia";
import {
  BOARD_PRESETS,
  type TargetProfileBase,
  type VideoOutputFormat,
} from "@/config/boardPresets";

type OutputFormat = VideoOutputFormat | "mp3";
type OutputSizeMode = "original" | "custom";
type FfmpegStatus = "idle" | "loading" | "ready" | "error";
type TargetSetupMode = "preset" | "custom";
type WorkspaceSectionId = "target" | "source" | "export";
type AppNavigationId = WorkspaceSectionId | "logs";
type AppView = "workspace" | "logs";
type AppTheme = "light" | "dark";

interface PersistedConversionPreferences {
  outputFormat: OutputFormat;
  orientation: VideoOrientation;
  scaleMode: VideoScaleMode;
}

const formatItems: Array<{ title: string; value: OutputFormat }> = [
  { title: "GIF", value: "gif" },
  { title: "MJPEG", value: "mjpeg" },
  { title: "AVI", value: "avi" },
  { title: "MP3 (audio extract)", value: "mp3" },
];

const scaleModeItems: Array<{ title: string; value: VideoScaleMode }> = [
  { title: "Fit (pad)", value: "fit" },
  { title: "Fill (crop)", value: "fill" },
  { title: "Stretch", value: "stretch" },
];

const orientationItems: Array<{ title: string; value: VideoOrientation }> = [
  { title: "None", value: "none" },
  { title: "Rotate 90 clockwise", value: "cw90" },
  { title: "Rotate 90 counter-clockwise", value: "ccw90" },
  { title: "Rotate 180", value: "flip180" },
];

const targetSetupModeItems: Array<{ title: string; value: TargetSetupMode }> = [
  { title: "Development board preset", value: "preset" },
  { title: "Custom target size", value: "custom" },
];

const navigationItems: Array<{ id: AppNavigationId; title: string; icon: string }> = [
  { id: "target", title: "Board", icon: "mdi-tune-variant" },
  { id: "source", title: "Source", icon: "mdi-file-video-outline" },
  { id: "export", title: "Export", icon: "mdi-file-export-outline" },
  { id: "logs", title: "Logs", icon: "mdi-text-box-search-outline" },
];
const workspaceSectionIds: WorkspaceSectionId[] = ["target", "source", "export"];

const resourceLinks: Array<{ title: string; icon: string; href: string }> = [
  {
    title: "Tutorial",
    icon: "mdi-youtube",
    href: "https://www.youtube.com/results?search_query=ffmpeg+video+conversion+tutorial",
  },
  {
    title: "Buy Me a Coffee",
    icon: "mdi-coffee-outline",
    href: "https://buymeacoffee.com/thelastoutpostworkshop",
  },
  {
    title: "Get Help",
    icon: "mdi-lifebuoy",
    href: "https://github.com/thelastoutpostworkshop/video_conversion",
  },
];

const sectionIdPrefix = "section-";
const themeStorageKey = "video-conversion.theme.v1";
const conversionPreferencesStorageKey = "video-conversion.preferences.v1";

const outputExtensionMap: Record<OutputFormat, string> = {
  gif: "gif",
  mjpeg: "mjpeg",
  avi: "avi",
  mp3: "mp3",
};

const outputMimeMap: Record<OutputFormat, string> = {
  gif: "image/gif",
  mjpeg: "video/x-motion-jpeg",
  avi: "video/x-msvideo",
  mp3: "audio/mpeg",
};

const outputFileUrl = ref<string | null>(null);

const outputFormat = ref<OutputFormat>("gif");
const outputFileName = ref("");
const outputSizeMode = ref<OutputSizeMode>("custom");
const width = ref<number | null>(320);
const height = ref<number | null>(240);
const scaleMode = ref<VideoScaleMode>("fit");
const orientation = ref<VideoOrientation>("none");
const fps = ref<number | null>(20);
const quality = ref<number | null>(5);
const startSeconds = ref<number | null>(null);
const endSeconds = ref<number | null>(null);
const startTimeInput = ref("");
const endTimeInput = ref("");
const isTrimRangeDragging = ref(false);
const mp3Bitrate = ref<number | null>(128);
const targetSetupMode = ref<TargetSetupMode>("preset");
const selectedBoardPresetId = ref<string>(BOARD_PRESETS[0]?.id ?? "");
const drawerOpen = ref(true);
const activeNavigation = ref<AppNavigationId>("target");

const { mdAndDown } = useDisplay();
const theme = useTheme();

const {
  sourceFile,
  isVideoSource,
  sourceMetadata,
  sourceMetadataLoading,
  sourceMetadataError,
  sourceMetadataLabel,
} = useSourceMedia();

const ffmpegStatus = ref<FfmpegStatus>("idle");
const processing = ref(false);
const processingProgress = ref(0);
const processingError = ref<string | null>(null);
const logLines = ref<string[]>([]);
let sectionObserver: IntersectionObserver | null = null;

let convertAbortController: AbortController | null = null;

const isVideoOutput = computed(() => outputFormat.value !== "mp3");

const boardPresetItems = computed(() =>
  BOARD_PRESETS.map((preset) => ({
    title: `${preset.name} (${preset.width}x${preset.height})`,
    value: preset.id,
  }))
);

const selectedBoardPreset = computed(() =>
  BOARD_PRESETS.find((preset) => preset.id === selectedBoardPresetId.value) ?? null
);

const ffmpegStatusText = computed(() => {
  if (ffmpegStatus.value === "loading") {
    return "FFmpeg loading";
  }
  if (ffmpegStatus.value === "ready") {
    return "FFmpeg ready";
  }
  if (ffmpegStatus.value === "error") {
    return "FFmpeg error";
  }
  return "FFmpeg idle";
});

const ffmpegStatusColor = computed(() => {
  if (ffmpegStatus.value === "loading") {
    return "info";
  }
  if (ffmpegStatus.value === "ready") {
    return "success";
  }
  if (ffmpegStatus.value === "error") {
    return "error";
  }
  return "warning";
});

const hasOutput = computed(() => Boolean(outputFileUrl.value));

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

const sourceDurationSeconds = computed<number | null>(() => {
  const duration = sourceMetadata.value?.durationSeconds;
  if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  return duration;
});

const clampTrimSeconds = (value: number): number => {
  const normalized = Number.isFinite(value) ? Math.max(0, value) : 0;
  const duration = sourceDurationSeconds.value;
  if (typeof duration === "number") {
    return Math.min(normalized, duration);
  }
  return normalized;
};

const parseTimeInputSeconds = (
  rawValue: string | number | null | undefined
): number | null | "invalid" => {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }
  const raw = String(rawValue).trim();
  if (!raw) {
    return null;
  }

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return "invalid";
    }
    return parsed < 0 ? 0 : parsed;
  }

  const parts = raw.split(":").map((part) => part.trim());
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => part.length === 0)) {
    return "invalid";
  }

  if (parts.length === 2) {
    const [minutesPart, secondsPart] = parts;
    if (!/^\d+$/.test(minutesPart) || !/^\d+(?:\.\d+)?$/.test(secondsPart)) {
      return "invalid";
    }
    const minutes = Number(minutesPart);
    const seconds = Number(secondsPart);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) {
      return "invalid";
    }
    return minutes * 60 + seconds;
  }

  const [hoursPart, minutesPart, secondsPart] = parts;
  if (
    !/^\d+$/.test(hoursPart) ||
    !/^\d+$/.test(minutesPart) ||
    !/^\d+(?:\.\d+)?$/.test(secondsPart)
  ) {
    return "invalid";
  }
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  const seconds = Number(secondsPart);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    minutes >= 60 ||
    seconds >= 60
  ) {
    return "invalid";
  }
  return hours * 3600 + minutes * 60 + seconds;
};

const parsedStartTimeSeconds = computed(() => parseTimeInputSeconds(startTimeInput.value));
const parsedEndTimeSeconds = computed(() => parseTimeInputSeconds(endTimeInput.value));
const startTimeInputInvalid = computed(() => parsedStartTimeSeconds.value === "invalid");
const endTimeInputInvalid = computed(() => parsedEndTimeSeconds.value === "invalid");
const hasTrimInputError = computed(
  () => startTimeInputInvalid.value || endTimeInputInvalid.value
);

const commitStartTimeInput = () => {
  const parsed = parsedStartTimeSeconds.value;
  if (parsed === "invalid") {
    return false;
  }
  startSeconds.value = typeof parsed === "number" ? clampTrimSeconds(parsed) : null;
  startTimeInput.value =
    startSeconds.value === null
      ? ""
      : formatDurationClock(startSeconds.value, { includeTenths: true });
  return true;
};

const commitEndTimeInput = () => {
  const parsed = parsedEndTimeSeconds.value;
  if (parsed === "invalid") {
    return false;
  }
  endSeconds.value = typeof parsed === "number" ? clampTrimSeconds(parsed) : null;
  endTimeInput.value =
    endSeconds.value === null
      ? ""
      : formatDurationClock(endSeconds.value, { includeTenths: true });
  return true;
};

const trimInputHelpText = computed(() => {
  const duration = sourceDurationSeconds.value;
  if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
    return `Use hh:mm:ss (or seconds). Source duration: ${formatDurationClock(duration, {
      includeTenths: true,
    })}`;
  }
  return "Use hh:mm:ss (or seconds).";
});

const trimRangeMax = computed(() => sourceDurationSeconds.value ?? previewSecondsMax.value);

const isTrimSliderAvailable = computed(
  () => hasPreviewSource.value && sourceDurationSeconds.value !== null
);

const trimRangeModel = computed<[number, number]>({
  get: () => {
    const max = trimRangeMax.value;
    const startCandidate =
      typeof parsedStartTimeSeconds.value === "number"
        ? parsedStartTimeSeconds.value
        : typeof startSeconds.value === "number"
          ? startSeconds.value
          : 0;
    const endCandidate =
      typeof parsedEndTimeSeconds.value === "number"
        ? parsedEndTimeSeconds.value
        : typeof endSeconds.value === "number"
          ? endSeconds.value
          : max;
    const clampedStart = Math.min(max, Math.max(0, startCandidate));
    const clampedEnd = Math.min(max, Math.max(clampedStart, endCandidate));
    return [clampedStart, clampedEnd];
  },
  set: (value) => {
    const [rawStart, rawEnd] = value;
    const max = trimRangeMax.value;
    const clampedStart = Math.min(max, Math.max(0, Number(rawStart) || 0));
    const clampedEnd = Math.min(max, Math.max(clampedStart, Number(rawEnd) || clampedStart));
    startSeconds.value = clampedStart;
    endSeconds.value = clampedEnd;
    startTimeInput.value = formatDurationClock(clampedStart, { includeTenths: true });
    endTimeInput.value = formatDurationClock(clampedEnd, { includeTenths: true });
  },
});

const trimRangeDisplayStart = computed(() =>
  formatDurationClock(trimRangeModel.value[0], { includeTenths: true })
);

const trimRangeDisplayEnd = computed(() =>
  formatDurationClock(trimRangeModel.value[1], { includeTenths: true })
);

const onTrimRangeDragStart = () => {
  isTrimRangeDragging.value = true;
};

const onTrimRangeDragEnd = () => {
  isTrimRangeDragging.value = false;
  syncPreviewWithinTrimRange();
};

const hasRangeError = computed(() => {
  if (
    typeof parsedStartTimeSeconds.value === "number" &&
    typeof parsedEndTimeSeconds.value === "number"
  ) {
    return parsedEndTimeSeconds.value <= parsedStartTimeSeconds.value;
  }
  return false;
});

const trimValidationMessage = computed(() => {
  if (hasTrimInputError.value) {
    return "Invalid trim time. Use hh:mm:ss (or seconds).";
  }
  return "End time must be greater than start time.";
});

const canConvert = computed(() => {
  if (!sourceFile.value || processing.value || previewFrameBusy.value) {
    return false;
  }
  if (hasTrimInputError.value) {
    return false;
  }
  if (hasRangeError.value) {
    return false;
  }
  if (outputSizeMode.value === "custom" && isVideoOutput.value) {
    return Boolean(width.value && width.value > 0 && height.value && height.value > 0);
  }
  return true;
});

const selectedBoardPresetDetails = computed(() => {
  const preset = selectedBoardPreset.value;
  if (!preset) {
    return "";
  }
  return `${preset.bundle}. ${preset.notes}`;
});

const previewTargetDimensions = computed<{ width: number; height: number } | null>(() => {
  if (!isVideoOutput.value) {
    return null;
  }

  let targetWidth: number | null = null;
  let targetHeight: number | null = null;

  if (
    outputSizeMode.value === "custom" &&
    typeof width.value === "number" &&
    width.value > 0 &&
    typeof height.value === "number" &&
    height.value > 0
  ) {
    targetWidth = Math.max(1, Math.round(width.value));
    targetHeight = Math.max(1, Math.round(height.value));
  } else if (sourceMetadata.value) {
    targetWidth = sourceMetadata.value.width;
    targetHeight = sourceMetadata.value.height;
    if (orientation.value === "cw90" || orientation.value === "ccw90") {
      const swappedWidth = targetHeight;
      targetHeight = targetWidth;
      targetWidth = swappedWidth;
    }
  }

  if (!targetWidth || !targetHeight) {
    return null;
  }

  return { width: targetWidth, height: targetHeight };
});

const activeView = computed<AppView>(() =>
  activeNavigation.value === "logs" ? "logs" : "workspace"
);
const logsText = computed(() => logLines.value.join("\n"));
const isDarkTheme = computed(() => theme.global.current.value.dark);
const themeToggleIcon = computed(() =>
  isDarkTheme.value ? "mdi-weather-sunny" : "mdi-weather-night"
);
const themeToggleLabel = computed(() =>
  isDarkTheme.value ? "Switch to light mode" : "Switch to dark mode"
);

const persistThemePreference = (nextTheme: AppTheme) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(themeStorageKey, nextTheme);
  } catch {
    // Ignore storage errors (private mode, blocked storage, etc.)
  }
};

const toggleTheme = () => {
  const nextTheme: AppTheme = isDarkTheme.value ? "light" : "dark";
  theme.change(nextTheme);
};

const isWorkspaceSectionId = (value: string): value is WorkspaceSectionId =>
  workspaceSectionIds.includes(value as WorkspaceSectionId);

const resolveSectionId = (elementId: string): WorkspaceSectionId | null => {
  if (!elementId.startsWith(sectionIdPrefix)) {
    return null;
  }
  const candidate = elementId.slice(sectionIdPrefix.length);
  return isWorkspaceSectionId(candidate) ? candidate : null;
};

const initializeSectionObserver = () => {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    return;
  }
  sectionObserver?.disconnect();
  sectionObserver = new IntersectionObserver(
    (entries) => {
      if (activeView.value === "logs") {
        return;
      }
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort(
          (a, b) =>
            Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top)
        );
      if (visibleEntries.length === 0) {
        return;
      }
      const nextSection = resolveSectionId(visibleEntries[0].target.id);
      if (nextSection) {
        activeNavigation.value = nextSection;
      }
    },
    {
      rootMargin: "-96px 0px -50% 0px",
      threshold: [0.15, 0.35, 0.6],
    }
  );

  for (const sectionId of workspaceSectionIds) {
    const section = document.getElementById(`${sectionIdPrefix}${sectionId}`);
    if (section) {
      sectionObserver.observe(section);
    }
  }
};

const navigateToSection = (sectionId: AppNavigationId) => {
  activeNavigation.value = sectionId;
  if (sectionId !== "logs") {
    void nextTick(() => {
      const section = document.getElementById(`${sectionIdPrefix}${sectionId}`);
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
  if (mdAndDown.value) {
    drawerOpen.value = false;
  }
};

const toNullableNumber = (value: string | number | null): number | null => {
  if (value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toPositiveNullable = (value: string | number | null): number | null => {
  const parsed = toNullableNumber(value);
  if (parsed === null) {
    return null;
  }
  return parsed <= 0 ? 1 : parsed;
};

const isVideoOrientation = (value: unknown): value is VideoOrientation =>
  value === "none" || value === "cw90" || value === "ccw90" || value === "flip180";

const isVideoScaleMode = (value: unknown): value is VideoScaleMode =>
  value === "fit" || value === "fill" || value === "stretch";

const isOutputFormat = (value: unknown): value is OutputFormat =>
  value === "gif" || value === "mjpeg" || value === "avi" || value === "mp3";

const persistConversionPreferences = () => {
  if (typeof window === "undefined") {
    return;
  }
  const preferences: PersistedConversionPreferences = {
    outputFormat: outputFormat.value,
    orientation: orientation.value,
    scaleMode: scaleMode.value,
  };
  try {
    window.localStorage.setItem(
      conversionPreferencesStorageKey,
      JSON.stringify(preferences)
    );
  } catch {
    // Ignore storage errors.
  }
};

const loadPersistedConversionPreferences = (): PersistedConversionPreferences | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(conversionPreferencesStorageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const outputFormatValue = parsed.outputFormat;
    const orientationValue = parsed.orientation;
    const scaleModeValue = parsed.scaleMode;
    if (
      !isOutputFormat(outputFormatValue) ||
      !isVideoOrientation(orientationValue) ||
      !isVideoScaleMode(scaleModeValue)
    ) {
      return null;
    }
    return {
      outputFormat: outputFormatValue,
      orientation: orientationValue,
      scaleMode: scaleModeValue,
    };
  } catch {
    return null;
  }
};

const applyTargetProfile = (
  profile: Omit<TargetProfileBase, "outputFormat"> & {
    name: string;
    outputFormat?: VideoOutputFormat;
  },
  options: { setOutputFormat?: boolean; writeLog?: boolean } = {}
) => {
  const setOutputFormat = options.setOutputFormat ?? true;
  const writeLog = options.writeLog ?? true;
  outputSizeMode.value = "custom";
  width.value = profile.width;
  height.value = profile.height;
  orientation.value = profile.orientation;
  scaleMode.value = profile.scaleMode;
  fps.value = profile.fps;
  quality.value = profile.quality;
  if (setOutputFormat && profile.outputFormat) {
    outputFormat.value = profile.outputFormat;
  }
  if (writeLog) {
    appendLog(
      `[app] Applied target profile: ${profile.name} (${profile.width}x${profile.height}).`
    );
  }
};

const applySelectedBoardPreset = (
  options: { setOutputFormat?: boolean; writeLog?: boolean } = {}
) => {
  const preset = selectedBoardPreset.value;
  if (!preset) {
    return;
  }
  applyTargetProfile(preset, options);
};

const applySizingDefaults = () => {
  if (outputSizeMode.value !== "custom") {
    return;
  }
  if (targetSetupMode.value === "preset") {
    applySelectedBoardPreset({ setOutputFormat: false, writeLog: false });
    return;
  }
  if (
    sourceMetadata.value &&
    (!width.value || width.value <= 0 || !height.value || height.value <= 0)
  ) {
    width.value = sourceMetadata.value.width;
    height.value = sourceMetadata.value.height;
  }
};

const appendLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  const entry = `[${timestamp}] ${message}`;
  const next = [...logLines.value, entry];
  logLines.value = next.slice(Math.max(0, next.length - 300));
};

const clearLogs = () => {
  logLines.value = [];
};

const revokeUrlRef = (target: { value: string | null }) => {
  if (target.value) {
    URL.revokeObjectURL(target.value);
    target.value = null;
  }
};

const clearOutput = () => {
  revokeUrlRef(outputFileUrl);
};

const fileBaseName = (name: string) => {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.slice(0, dotIndex) : name;
};

const buildDefaultOutputName = (name: string, format: OutputFormat) =>
  `${fileBaseName(name)}.${outputExtensionMap[format]}`;

const ensureOutputFileName = (
  raw: string,
  sourceName: string,
  format: OutputFormat
) => {
  const fallback = buildDefaultOutputName(sourceName, format);
  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }
  const requiredExt = `.${outputExtensionMap[format]}`;
  if (trimmed.toLowerCase().endsWith(requiredExt)) {
    return trimmed;
  }
  const base = fileBaseName(trimmed);
  return `${base}${requiredExt}`;
};

const initializeFfmpeg = async (): Promise<boolean> => {
  if (ffmpegStatus.value === "ready") {
    return true;
  }
  if (ffmpegStatus.value === "loading") {
    return false;
  }
  ffmpegStatus.value = "loading";
  processingError.value = null;
  appendLog("[app] Loading FFmpeg core...");
  try {
    await mediaProcessingService.ensureReady();
    ffmpegStatus.value = "ready";
    appendLog("[app] FFmpeg ready.");
    return true;
  } catch (error) {
    ffmpegStatus.value = "error";
    const message =
      error instanceof Error ? error.message : "Failed to initialize FFmpeg.";
    processingError.value = message;
    appendLog(`[error] ${message}`);
    return false;
  }
};

const {
  previewFrameUrl,
  previewFrameBusy,
  previewFrameError,
  previewFrameSeconds,
  clearPreviewFrame,
  clearPreviewDebounce,
  schedulePreviewFrameRefresh,
} = usePreviewFrame({
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
  ensureFfmpegReady: initializeFfmpeg,
  onLog: appendLog,
});

const previewSecondsMax = computed(() => {
  const duration = sourceMetadata.value?.durationSeconds;
  if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
    return Math.max(0.5, Number(duration.toFixed(1)));
  }
  return 30;
});

const previewSecondsStep = computed(() =>
  previewSecondsMax.value <= 30 ? 0.1 : 0.5
);

const previewSecondMin = computed(() => trimRangeModel.value[0]);

const previewSecondMax = computed(() => {
  const trimEnd = trimRangeModel.value[1];
  const fallback = previewSecondsMax.value;
  return trimEnd >= previewSecondMin.value ? trimEnd : fallback;
});

const clampPreviewSecond = (value: number) =>
  Math.min(previewSecondMax.value, Math.max(previewSecondMin.value, value));

const previewSecondModel = computed<number>({
  get: () =>
    typeof previewFrameSeconds.value === "number"
      ? clampPreviewSecond(previewFrameSeconds.value)
      : previewSecondMin.value,
  set: (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      previewFrameSeconds.value = previewSecondMin.value;
      return;
    }
    previewFrameSeconds.value = clampPreviewSecond(parsed);
  },
});

const syncPreviewWithinTrimRange = () => {
  if (!hasPreviewSource.value) {
    return;
  }
  const current =
    typeof previewFrameSeconds.value === "number"
      ? previewFrameSeconds.value
      : previewSecondMin.value;
  const clamped = clampPreviewSecond(current);
  if (Math.abs(clamped - current) < 0.001) {
    return;
  }
  previewSecondModel.value = clamped;
};

const hasPreviewSource = computed(
  () => Boolean(sourceFile.value) && isVideoSource.value && isVideoOutput.value
);

const isPreviewSliderDisabled = computed(
  () => processing.value || !hasPreviewSource.value
);

const previewSliderColor = computed(() =>
  hasPreviewSource.value ? "primary" : "grey-darken-1"
);

const previewSecondDisplay = computed(() => {
  if (!hasPreviewSource.value) {
    return "Unavailable";
  }
  return `${formatDurationClock(previewSecondModel.value, { includeTenths: true })} / ${formatDurationClock(
    previewSecondsMax.value,
    { includeTenths: true }
  )}`;
});

const buildVideoOptions = (): VideoTranscodeOptions => {
  const options: VideoTranscodeOptions = {
    orientation: orientation.value,
  };
  if (outputSizeMode.value === "custom" && width.value && height.value) {
    options.width = Math.max(1, Math.round(width.value));
    options.height = Math.max(1, Math.round(height.value));
    options.scaleMode = scaleMode.value;
  }
  if (fps.value && fps.value > 0) {
    options.fps = Math.round(fps.value);
  }
  if (quality.value && quality.value > 0) {
    options.quality = Math.round(quality.value);
  }
  if (typeof startSeconds.value === "number") {
    options.startSeconds = Math.max(0, startSeconds.value);
  }
  if (typeof endSeconds.value === "number") {
    options.endSeconds = Math.max(0, endSeconds.value);
  }
  return options;
};

const buildAudioOptions = (): AudioTranscodeOptions => {
  const options: AudioTranscodeOptions = {};
  if (mp3Bitrate.value && mp3Bitrate.value > 0) {
    options.bitrateKbps = Math.round(mp3Bitrate.value);
  }
  return options;
};

const runConversion = async () => {
  const file = sourceFile.value;
  if (!file) {
    processingError.value = "Select a source media file.";
    return;
  }
  if (!commitStartTimeInput() || !commitEndTimeInput()) {
    processingError.value = "Invalid trim time. Use hh:mm:ss (or seconds).";
    return;
  }
  if (hasRangeError.value) {
    processingError.value = "End time must be greater than start time.";
    return;
  }
  const ready = await initializeFfmpeg();
  if (!ready) {
    return;
  }

  processing.value = true;
  processingProgress.value = 0;
  processingError.value = null;
  clearOutput();

  const onProgress: MediaProgressCallback = (percent) => {
    processingProgress.value = percent;
  };
  const onLog: MediaLogCallback = (message) => {
    appendLog(message);
  };

  convertAbortController = new AbortController();

  try {
    const signal = convertAbortController.signal;
    let payload: Uint8Array;

    if (outputFormat.value === "gif") {
      const result = await mediaProcessingService.transcodeVideoToGif(
        file,
        buildVideoOptions(),
        onProgress,
        onLog,
        signal
      );
      payload = result.data;
    } else if (outputFormat.value === "mjpeg") {
      const result = await mediaProcessingService.transcodeVideoToMjpeg(
        file,
        buildVideoOptions(),
        onProgress,
        onLog,
        signal
      );
      payload = result.data;
    } else if (outputFormat.value === "avi") {
      const result = await mediaProcessingService.transcodeVideoToAvi(
        file,
        buildVideoOptions(),
        onProgress,
        onLog,
        signal
      );
      payload = result.data;
    } else {
      const result = await mediaProcessingService.extractAudioFromVideo(
        file,
        buildAudioOptions(),
        onProgress,
        onLog,
        signal
      );
      payload = result.data;
    }

    const finalName = ensureOutputFileName(outputFileName.value, file.name, outputFormat.value);
    outputFileName.value = finalName;
    const outputBlob = new Blob([payload], { type: outputMimeMap[outputFormat.value] });
    outputFileUrl.value = URL.createObjectURL(outputBlob);
    processingProgress.value = 100;
    appendLog(
      `[app] Output ready: ${finalName} (${(outputBlob.size / (1024 * 1024)).toFixed(2)} MB)`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Media conversion failed.";
    const wasCancelled = message.toLowerCase().includes("cancelled");
    if (wasCancelled) {
      ffmpegStatus.value = "idle";
      appendLog("[app] Conversion cancelled.");
    } else {
      processingError.value = message;
      appendLog(`[error] ${message}`);
    }
  } finally {
    processing.value = false;
    convertAbortController = null;
  }
};

const cancelConversion = () => {
  if (!convertAbortController) {
    return;
  }
  convertAbortController.abort();
};

const downloadOutput = () => {
  if (!outputFileUrl.value) {
    return;
  }
  const link = document.createElement("a");
  link.href = outputFileUrl.value;
  link.download = outputFileName.value || `output.${outputExtensionMap[outputFormat.value]}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

watch(
  mdAndDown,
  (isMobile) => {
    drawerOpen.value = !isMobile;
  },
  { immediate: true }
);

watch(
  () => theme.global.name.value,
  (nextTheme) => {
    if (nextTheme === "light" || nextTheme === "dark") {
      persistThemePreference(nextTheme);
    }
  },
  { immediate: true }
);

watch([outputFormat, orientation, scaleMode], () => {
  persistConversionPreferences();
});

watch([previewSecondsMax, previewSecondMin, previewSecondMax], () => {
  if (isTrimRangeDragging.value) {
    return;
  }
  syncPreviewWithinTrimRange();
});

watch(activeView, (nextView) => {
  if (nextView === "logs") {
    sectionObserver?.disconnect();
    sectionObserver = null;
    return;
  }
  void nextTick(() => {
    initializeSectionObserver();
  });
});

watch(sourceFile, (file) => {
  clearPreviewDebounce();
  clearOutput();
  clearPreviewFrame();
  processingError.value = null;
  processingProgress.value = 0;

  if (!file) {
    outputFileName.value = "";
    return;
  }

  outputFileName.value = buildDefaultOutputName(file.name, outputFormat.value);

  if (isVideoSource.value && isVideoOutput.value) {
    previewSecondModel.value = previewSecondMin.value;
    schedulePreviewFrameRefresh(50);
  }
});

watch(sourceMetadata, (metadata) => {
  if (!metadata) {
    return;
  }
  applySizingDefaults();
});

watch(outputFormat, (format) => {
  clearOutput();
  if (!sourceFile.value) {
    outputFileName.value = "";
    return;
  }
  outputFileName.value = buildDefaultOutputName(sourceFile.value.name, format);
});

watch(targetSetupMode, (mode) => {
  if (!isVideoOutput.value) {
    return;
  }
  if (mode === "preset") {
    applySelectedBoardPreset();
  }
});

watch(selectedBoardPresetId, () => {
  if (targetSetupMode.value !== "preset" || !isVideoOutput.value) {
    return;
  }
  applySelectedBoardPreset();
});

watch(outputSizeMode, (mode) => {
  if (mode !== "custom") {
    return;
  }
  applySizingDefaults();
});

watch(isVideoOutput, (nextIsVideoOutput) => {
  if (!nextIsVideoOutput) {
    return;
  }
  applySizingDefaults();
});

onMounted(() => {
  applySizingDefaults();
  const persistedPreferences = loadPersistedConversionPreferences();
  if (persistedPreferences) {
    outputFormat.value = persistedPreferences.outputFormat;
    orientation.value = persistedPreferences.orientation;
    scaleMode.value = persistedPreferences.scaleMode;
  }
  void initializeFfmpeg();
  if (activeView.value === "workspace") {
    void nextTick(() => {
      initializeSectionObserver();
    });
  }
});

onBeforeUnmount(() => {
  sectionObserver?.disconnect();
  sectionObserver = null;
  if (convertAbortController) {
    convertAbortController.abort();
    convertAbortController = null;
  }
  clearPreviewDebounce();
  clearOutput();
  clearPreviewFrame();
});
</script>

<style scoped>
.app-main {
  background:
    radial-gradient(circle at 18% 14%, rgba(var(--v-theme-primary), 0.14), transparent 36%),
    radial-gradient(circle at 84% 0%, rgba(var(--v-theme-secondary), 0.14), transparent 28%),
    linear-gradient(
      165deg,
      rgba(var(--v-theme-background), 1) 0%,
      rgba(var(--v-theme-surface), 0.98) 58%,
      rgba(var(--v-theme-background), 1) 100%
    );
}

.app-navigation {
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.app-navigation :deep(.v-navigation-drawer__content) {
  background: rgba(var(--v-theme-surface), 0.9);
  backdrop-filter: blur(10px);
}

.app-bar {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-surface), 0.88);
  backdrop-filter: blur(10px);
}

.resources-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.resources-list :deep(.v-list-item-title) {
  font-weight: 600;
}

.step-heading {
  display: grid;
  gap: 2px;
}

.section-target-grid {
  row-gap: 4px;
}

.target-custom-hint {
  min-height: 40px;
}

.target-preset-note {
  line-height: 1.3;
  padding-left: 2px;
}

.preview-time-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.preview-time-card--inactive {
  background: rgba(var(--v-theme-surface), 0.32);
}

.preview-position-slider--inactive {
  opacity: 0.55;
}

.preview-position-slider--inactive :deep(.v-slider-track__background),
.preview-position-slider--inactive :deep(.v-slider-track__fill) {
  background-color: rgba(var(--v-theme-on-surface), 0.24) !important;
}

.preview-position-slider--inactive :deep(.v-slider-thumb__surface) {
  background-color: rgba(var(--v-theme-on-surface), 0.3) !important;
}

.source-metadata-inline {
  background: rgba(var(--v-theme-surface), 0.48);
}

.preview-generation-status {
  letter-spacing: 0.01em;
}

.app-nav-target {
  scroll-margin-top: 96px;
}

.panel-card {
  backdrop-filter: blur(6px);
  background: rgba(var(--v-theme-surface), 0.92);
}

.logs-view-card {
  min-height: 68vh;
}

.logs-view-output :deep(textarea) {
  min-height: 58vh;
}

.log-output :deep(textarea) {
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.8rem;
}

@media (max-width: 959px) {
  .app-nav-target {
    scroll-margin-top: 84px;
  }
}
</style>
