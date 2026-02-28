<template>
  <v-app>
    <v-navigation-drawer permanent width="280" class="app-navigation">
      <div class="pa-4">
        <div class="text-overline text-medium-emphasis">The last outpost workshop</div>
        <v-list nav density="comfortable" class="mt-2">
          <v-list-item
            v-for="item in navigationItems"
            :key="item.id"
            :prepend-icon="item.icon"
            :title="item.title"
            :active="activeNavigation === item.id"
            :disabled="isNavigationItemDisabled(item.id)"
            color="primary"
            rounded="lg"
            @click="navigateToView(item.id)"
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
    </v-app-bar>

    <v-main class="app-main">
      <v-container class="py-6">
        <v-row justify="center">
          <v-col cols="12" xl="10">
            <BoardCatalog
              v-if="activeView === 'boards'"
              :presets="BOARD_PRESETS"
              :target-setup-mode="targetSetupMode"
              :selected-preset-id="selectedBoardPresetId"
              :processing="processing"
              :custom-board-width="customBoardWidth"
              :custom-board-height="customBoardHeight"
              :custom-board-round-display="customBoardRoundDisplay"
              :custom-board-validation-message="customBoardValidationMessage"
              :is-custom-board-selected="isCustomBoardSelected"
              :custom-target-width="width"
              :custom-target-height="height"
              @select-preset="selectBoardFromCatalog"
              @update:custom-board-width="(value) => (customBoardWidth = value)"
              @update:custom-board-height="(value) => (customBoardHeight = value)"
              @update:custom-board-round-display="(value) => (customBoardRoundDisplay = value)"
              @select-custom-board="selectCustomBoard"
            />

            <div v-else-if="activeView === 'workspace'">
                <section class="workspace-section">
                  <div id="section-source" class="app-nav-target" />
                  <div class="step-heading mb-2">
                    <div class="text-subtitle-1 font-weight-medium">
                      Source media
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
                  </v-col>
                </v-row>

                <v-row dense class="mt-2">
                  <v-col cols="12" md="8">
                    <v-card
                      variant="tonal"
                      class="preview-time-card"
                      :class="{ 'preview-time-card--inactive': !hasPreviewSource }"
                    >
                      <v-card-text class="preview-time-card__body">
                        <div class="d-flex align-center preview-time-card__header">
                          <div class="text-subtitle-2">Preview frame position</div>
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
                          density="compact"
                          thumb-label
                          hide-details
                        >
                          <template #thumb-label="{ modelValue }">
                            {{ formatDurationClock(Number(modelValue), { includeTenths: true }) }}
                          </template>
                        </v-slider>
                      </v-card-text>
                    </v-card>

                    <div>
                      <v-sheet
                        v-if="hasBoardSelection"
                        class="preview-board-context px-3 py-2 mb-2"
                        rounded="lg"
                        border
                      >
                        <div class="d-flex align-center flex-wrap ga-2">
                          <div class="d-flex align-center ga-2">
                            <v-icon icon="mdi-monitor-dashboard" size="18" color="info" />
                            <span class="text-caption text-medium-emphasis">Target display</span>
                          </div>
                          <v-chip
                            color="info"
                            variant="tonal"
                            size="large"
                            class="preview-board-chip"
                          >
                            {{ workspaceBoardSummary }}
                          </v-chip>
                          <v-spacer />
                          <v-btn
                            size="small"
                            variant="tonal"
                            prepend-icon="mdi-view-grid-outline"
                            :disabled="processing"
                            @click="navigateToView('boards')"
                          >
                            Change board
                          </v-btn>
                        </div>
                      </v-sheet>
                      <PreviewFrameSurface
                        :preview-frame-url="previewFrameUrl"
                        :preview-frame-busy="previewFrameBusy"
                        :has-source-file="Boolean(sourceFile)"
                        :is-video-source="isVideoSource"
                        :is-video-output="isVideoOutput"
                        :round-display="workspaceRoundDisplay"
                        :target-width="previewTargetDimensions?.width ?? null"
                        :target-height="previewTargetDimensions?.height ?? null"
                      />
                    </div>

                    <v-sheet class="workspace-subsection mt-4 pa-3" rounded="lg" border>
                      <div id="section-export" class="app-nav-target" />
                      <div class="step-heading mb-2">
                        <div class="text-subtitle-1 font-weight-medium">
                          Convert and download
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          Launch conversion, monitor progress, and download the output file.
                        </div>
                      </div>

                      <v-row dense>
                        <v-col cols="12">
                          <v-text-field
                            v-model="outputFileName"
                            label="Output file name"
                            density="comfortable"
                            :disabled="processing"
                          />
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
                    </v-sheet>
                  </v-col>
                  <v-col cols="12" md="4" class="d-flex flex-column ga-3">
                    <v-card variant="tonal" class="settings-side-card">
                      <v-card-text class="py-3">
                        <div class="step-heading mb-2">
                          <div class="text-subtitle-1 font-weight-medium">
                            Conversion settings
                          </div>
                          <div class="text-caption text-medium-emphasis">
                            Tune size, orientation, quality, and trimming before conversion.
                          </div>
                        </div>

                        <v-row dense>
                          <v-col cols="12">
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
                              v-if="trimmedOutputDurationDisplay"
                              class="text-caption text-medium-emphasis mt-1"
                            >
                              Output clip duration {{ trimmedOutputDurationDisplay }}
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
                </section>
            </div>
            <v-card v-else-if="activeView === 'logs'" rounded="lg" elevation="4" class="panel-card logs-view-card">
              <v-card-title class="d-flex align-center">
                <div class="text-h6">Session Log</div>
                <v-spacer />
                <v-btn
                  size="small"
                  variant="text"
                  prepend-icon="mdi-content-copy"
                  :disabled="logLines.length === 0"
                  @click="copyLogsToClipboard"
                >
                  Copy
                </v-btn>
                <v-btn
                  size="small"
                  variant="text"
                  prepend-icon="mdi-download"
                  :disabled="logLines.length === 0"
                  @click="downloadLogs"
                >
                  Download
                </v-btn>
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
            <AboutView v-else />
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-dialog :model-value="processing" persistent max-width="560">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-progress-clock" />
          <span>Conversion in progress</span>
        </v-card-title>
        <v-card-text>
          <div class="text-body-2 mb-2">
            {{ processingStatusMessage }}
          </div>
          <v-progress-linear
            :model-value="processingProgressDisplay"
            :indeterminate="processingProgressIndeterminate"
            color="primary"
            height="8"
            rounded
          />
          <div class="text-caption text-medium-emphasis mt-1">
            {{ processingProgressCaption }}
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            {{ processingLiveStatusCaption }}
          </div>
          <div class="text-caption text-success mt-1 processing-confidence-line">
            {{ processingConfidenceCaption }}
          </div>
          <div
            v-if="processingActivityLine"
            class="text-caption text-medium-emphasis mt-1 processing-activity-line"
          >
            {{ processingActivityLine }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="error" variant="tonal" @click="cancelConversion">
            Cancel conversion
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useTheme } from "vuetify";
import AboutView from "@/components/AboutView.vue";
import BoardCatalog from "@/components/BoardCatalog.vue";
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
type AppNavigationId = "boards" | "workspace" | "logs" | "about";
type AppView = AppNavigationId;
type AppTheme = "light" | "dark";
type ProcessingProgressMode = "reliable" | "estimated";
type ProcessingPhase = "idle" | "preparing" | "encoding" | "finalizing" | "packaging" | "complete";

interface PersistedBoardSelection {
  mode: TargetSetupMode;
  presetId?: string;
  width?: number;
  height?: number;
  roundDisplay?: boolean;
}

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

const navigationItems: Array<{ id: AppNavigationId; title: string; icon: string }> = [
  { id: "boards", title: "Board Catalog", icon: "mdi-view-grid-outline" },
  { id: "workspace", title: "Convert", icon: "mdi-file-cog-outline" },
  { id: "logs", title: "Session Log", icon: "mdi-text-box-search-outline" },
  { id: "about", title: "About", icon: "mdi-information-outline" },
];

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

const themeStorageKey = "video-conversion.theme.v1";
const conversionPreferencesStorageKey = "video-conversion.preferences.v1";
const boardSelectionStorageKey = "video-conversion.board-selection.v1";

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
const width = ref<number | null>(null);
const height = ref<number | null>(null);
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
const selectedBoardPresetId = ref<string>("");
const customBoardWidth = ref<number | null>(null);
const customBoardHeight = ref<number | null>(null);
const customBoardRoundDisplay = ref(false);
const customBoardValidationMessage = ref<string | null>(null);
const activeNavigation = ref<AppNavigationId>("boards");

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
const processingProgressMode = ref<ProcessingProgressMode>("reliable");
const processingPhase = ref<ProcessingPhase>("idle");
const processingActivityLine = ref<string | null>(null);
const processingStartedAtMs = ref<number | null>(null);
const processingLastActivityAtMs = ref<number | null>(null);
const processingUiTick = ref(0);
const processingError = ref<string | null>(null);
const logLines = ref<string[]>([]);

let convertAbortController: AbortController | null = null;
let processingUiTimer: ReturnType<typeof setInterval> | null = null;
const cancelRequested = ref(false);

const isVideoOutput = computed(() => outputFormat.value !== "mp3");

const selectedBoardPreset = computed(() =>
  BOARD_PRESETS.find((preset) => preset.id === selectedBoardPresetId.value) ?? null
);

const hasCustomBoardDimensions = computed(
  () =>
    typeof width.value === "number" &&
    width.value > 0 &&
    typeof height.value === "number" &&
    height.value > 0
);

const isCustomBoardSelected = computed(
  () => targetSetupMode.value === "custom" && hasCustomBoardDimensions.value
);

const hasBoardSelection = computed(
  () =>
    (targetSetupMode.value === "preset" && selectedBoardPreset.value !== null) ||
    isCustomBoardSelected.value
);

const workspaceBoardSummary = computed(() => {
  if (targetSetupMode.value === "preset" && selectedBoardPreset.value) {
    return `${selectedBoardPreset.value.name} (${selectedBoardPreset.value.width}x${selectedBoardPreset.value.height})`;
  }
  if (isCustomBoardSelected.value && width.value && height.value) {
    return `Custom board (${Math.round(width.value)}x${Math.round(height.value)}${
      customBoardRoundDisplay.value ? ", round" : ""
    })`;
  }
  return "No board selected";
});

const workspaceRoundDisplay = computed(() => {
  if (targetSetupMode.value === "preset") {
    return Boolean(selectedBoardPreset.value?.roundDisplay);
  }
  if (isCustomBoardSelected.value) {
    return customBoardRoundDisplay.value;
  }
  return false;
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

const trimmedOutputDurationSeconds = computed<number | null>(() => {
  const sourceDuration = sourceDurationSeconds.value;
  if (typeof sourceDuration !== "number" || !Number.isFinite(sourceDuration) || sourceDuration <= 0) {
    return null;
  }
  const [start, end] = trimRangeModel.value;
  const duration = Math.max(0, end - start);
  return Number.isFinite(duration) ? duration : null;
});

const trimmedOutputDurationDisplay = computed(() => {
  const duration = trimmedOutputDurationSeconds.value;
  if (typeof duration !== "number") {
    return null;
  }
  return formatDurationClock(duration, { includeTenths: true });
});

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
  if (!hasBoardSelection.value) {
    return false;
  }
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

const activeView = computed<AppView>(() => activeNavigation.value);
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

const isNavigationItemDisabled = (viewId: AppNavigationId) =>
  viewId === "workspace" && !hasBoardSelection.value;

const navigateToView = (viewId: AppNavigationId) => {
  if (viewId === "workspace" && !hasBoardSelection.value) {
    activeNavigation.value = "boards";
    return;
  }
  activeNavigation.value = viewId;
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

const persistBoardSelection = () => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (targetSetupMode.value === "preset" && selectedBoardPreset.value) {
      const payload: PersistedBoardSelection = {
        mode: "preset",
        presetId: selectedBoardPreset.value.id,
      };
      window.localStorage.setItem(boardSelectionStorageKey, JSON.stringify(payload));
      return;
    }
    if (targetSetupMode.value === "custom" && hasCustomBoardDimensions.value) {
      const payload: PersistedBoardSelection = {
        mode: "custom",
        width: Math.max(1, Math.round(width.value ?? 1)),
        height: Math.max(1, Math.round(height.value ?? 1)),
        roundDisplay: customBoardRoundDisplay.value,
      };
      window.localStorage.setItem(boardSelectionStorageKey, JSON.stringify(payload));
      return;
    }
    window.localStorage.removeItem(boardSelectionStorageKey);
  } catch {
    // Ignore storage errors.
  }
};

const loadPersistedBoardSelection = (): PersistedBoardSelection | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(boardSelectionStorageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedBoardSelection;
    if (parsed.mode === "preset" && typeof parsed.presetId === "string") {
      if (BOARD_PRESETS.some((preset) => preset.id === parsed.presetId)) {
        return { mode: "preset", presetId: parsed.presetId };
      }
      return null;
    }

    if (
      parsed.mode === "custom" &&
      typeof parsed.width === "number" &&
      Number.isFinite(parsed.width) &&
      parsed.width > 0 &&
      typeof parsed.height === "number" &&
      Number.isFinite(parsed.height) &&
      parsed.height > 0
    ) {
      return {
        mode: "custom",
        width: Math.round(parsed.width),
        height: Math.round(parsed.height),
        roundDisplay: parsed.roundDisplay === true,
      };
    }
    return null;
  } catch {
    // Backward compatibility: older versions stored a plain preset id string.
    const raw = window.localStorage.getItem(boardSelectionStorageKey);
    if (raw && BOARD_PRESETS.some((preset) => preset.id === raw)) {
      return { mode: "preset", presetId: raw };
    }
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

const selectBoardFromCatalog = (presetId: string) => {
  customBoardValidationMessage.value = null;
  targetSetupMode.value = "preset";
  if (selectedBoardPresetId.value !== presetId) {
    selectedBoardPresetId.value = presetId;
  } else {
    applySelectedBoardPreset();
  }
  persistBoardSelection();
  activeNavigation.value = "workspace";
};

const applySizingDefaults = () => {
  if (targetSetupMode.value === "preset" && selectedBoardPreset.value) {
    applySelectedBoardPreset({ setOutputFormat: false, writeLog: false });
  }
};

const selectCustomBoard = () => {
  if (
    typeof customBoardWidth.value !== "number" ||
    customBoardWidth.value <= 0 ||
    typeof customBoardHeight.value !== "number" ||
    customBoardHeight.value <= 0
  ) {
    customBoardValidationMessage.value = "Set valid width and height for your custom board.";
    return;
  }

  customBoardValidationMessage.value = null;
  targetSetupMode.value = "custom";
  width.value = Math.max(1, Math.round(customBoardWidth.value));
  height.value = Math.max(1, Math.round(customBoardHeight.value));
  persistBoardSelection();
  appendLog(
    `[app] Using custom board target ${width.value}x${height.value}${
      customBoardRoundDisplay.value ? " (round screen)." : "."
    }`
  );
  activeNavigation.value = "workspace";
};

const appendLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  const entry = `[${timestamp}] ${message}`;
  const next = [...logLines.value, entry];
  logLines.value = next.slice(Math.max(0, next.length - 300));
};

const bumpProcessingUiTick = () => {
  processingUiTick.value = Date.now();
};

const startProcessingUiTimer = () => {
  if (processingUiTimer) {
    clearInterval(processingUiTimer);
  }
  bumpProcessingUiTick();
  processingUiTimer = setInterval(() => {
    bumpProcessingUiTick();
  }, 1000);
};

const stopProcessingUiTimer = () => {
  if (!processingUiTimer) {
    return;
  }
  clearInterval(processingUiTimer);
  processingUiTimer = null;
};

const markProcessingActivity = () => {
  processingLastActivityAtMs.value = Date.now();
  bumpProcessingUiTick();
};

const formatClockFromMs = (rawMs: number): string => {
  if (!Number.isFinite(rawMs) || rawMs < 0) {
    return "00:00";
  }
  return formatDurationClock(rawMs / 1000);
};

const summarizeProcessingLogLine = (message: string): string | null => {
  if (!message || !message.trim()) {
    return null;
  }

  const progressSegments = message
    .split(/[\r\n]+/)
    .map((segment) =>
      segment
        .replace(/^\[(?:stderr|stdout|fferr|ffout)\]\s*/i, "")
        .replace(/[ \t]+/g, " ")
        .trim()
    )
    .filter(Boolean);

  let bestProgressSummary: string | null = null;
  let bestProgressScore = -1;
  for (const segment of progressSegments) {
    if (!/(?:\bframe=|\btime=|\bspeed=)/i.test(segment)) {
      continue;
    }

    const frameMatches = [...segment.matchAll(/\bframe=\s*(\d+)/gi)];
    const timeMatches = [...segment.matchAll(/\btime=\s*([^\s]+)/gi)];
    const speedMatches = [...segment.matchAll(/\bspeed=\s*([^\s]+)/gi)];

    const frameValueRaw =
      frameMatches.length > 0 ? frameMatches[frameMatches.length - 1]?.[1] ?? null : null;
    const timeValue =
      timeMatches.length > 0 ? timeMatches[timeMatches.length - 1]?.[1] ?? "" : "";
    const speedValue =
      speedMatches.length > 0 ? speedMatches[speedMatches.length - 1]?.[1] ?? "" : "";

    const parts: string[] = [];
    let score = 0;

    if (frameValueRaw !== null) {
      const frameValue = Number(frameValueRaw);
      if (Number.isFinite(frameValue) && frameValue > 0) {
        parts.push(`Frame ${Math.round(frameValue)}`);
        score += 2;
      }
    }
    if (timeValue && !timeValue.startsWith("-") && !/^n\/a$/i.test(timeValue)) {
      parts.push(`Encoded ${timeValue}`);
      score += 2;
    }
    if (speedValue && !/^n\/a$/i.test(speedValue)) {
      parts.push(`Speed ${speedValue}`);
      score += 2;
    }

    if (parts.length > 0 && score >= bestProgressScore) {
      bestProgressSummary = parts.join(" • ");
      bestProgressScore = score;
    } else if (bestProgressSummary === null) {
      bestProgressSummary = "FFmpeg is processing the conversion...";
      bestProgressScore = 0;
    }
  }

  if (bestProgressSummary) {
    return bestProgressSummary;
  }

  const line = message.replace(/\s+/g, " ").trim();
  if (!line) {
    return null;
  }

  if (/^\[app\]\s+exec\b/i.test(line)) {
    return "Starting FFmpeg command...";
  }
  if (/\bOutput #\d+/i.test(line)) {
    return "Configuring output stream...";
  }
  if (/\bvideo:\s*\d+/i.test(line) || /\baudio:\s*\d+/i.test(line)) {
    return "Writing final media file...";
  }
  return null;
};

const isDetailedProcessingActivityLine = (line: string | null): boolean =>
  typeof line === "string" &&
  /\bFrame\s+\d+\b/i.test(line) &&
  (/\bEncoded\b/i.test(line) || /\bSpeed\b/i.test(line));

const createLogFileName = (): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `ffmpeg-logs-${timestamp}.txt`;
};

const copyLogsToClipboard = async () => {
  const text = logsText.value;
  if (!text) {
    return;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Clipboard permission might be blocked; fall back to execCommand.
    }
  }

  if (typeof document === "undefined") {
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    textarea.remove();
  }
};

const clearLogs = () => {
  logLines.value = [];
};

const downloadLogs = () => {
  const text = logsText.value;
  if (!text || typeof document === "undefined") {
    return;
  }
  const logBlob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const logUrl = URL.createObjectURL(logBlob);
  const link = document.createElement("a");
  link.href = logUrl;
  link.download = createLogFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(logUrl);
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

const hasTrimSelection = computed(() => {
  if (!isVideoOutput.value) {
    return false;
  }
  const hasStartTrim = typeof startSeconds.value === "number" && startSeconds.value > 0;
  const hasEndTrim = typeof endSeconds.value === "number" && endSeconds.value > 0;
  return hasStartTrim || hasEndTrim;
});

const processingProgressDisplay = computed(() => {
  const normalized = Math.max(0, Math.min(100, Math.round(processingProgress.value)));
  if (processingPhase.value === "complete") {
    return 100;
  }
  return normalized >= 100 ? 99 : normalized;
});

const processingProgressIndeterminate = computed(() => {
  if (!processing.value) {
    return false;
  }
  if (processingPhase.value === "preparing") {
    return true;
  }
  if (processingProgressMode.value === "estimated") {
    return true;
  }
  return processingProgressDisplay.value <= 0;
});

const processingProgressCaption = computed(() => {
  if (processingPhase.value === "finalizing") {
    return "Finalizing output...";
  }
  if (processingPhase.value === "packaging") {
    return "Preparing output file...";
  }
  if (processingPhase.value === "preparing") {
    return "Starting conversion...";
  }
  if (processingProgressMode.value === "estimated") {
    const estimate = processingProgressDisplay.value;
    return estimate > 0 ? `Estimated progress ${estimate}%` : "Estimating progress...";
  }
  return `Progress ${processingProgressDisplay.value}%`;
});

const processingElapsedLabel = computed(() => {
  void processingUiTick.value;
  const startedAt = processingStartedAtMs.value;
  if (!startedAt) {
    return "00:00";
  }
  return formatClockFromMs(Date.now() - startedAt);
});

const processingLastActivityLabel = computed(() => {
  void processingUiTick.value;
  const lastActivityAt = processingLastActivityAtMs.value;
  if (!lastActivityAt) {
    return "Waiting for first FFmpeg update...";
  }
  const seconds = Math.max(0, Math.floor((Date.now() - lastActivityAt) / 1000));
  if (seconds <= 1) {
    return "FFmpeg active just now";
  }
  if (seconds < 8) {
    return `FFmpeg active ${seconds}s ago`;
  }
  return `No update for ${seconds}s (still running)`;
});

const processingLiveStatusCaption = computed(
  () => `Elapsed ${processingElapsedLabel.value} • ${processingLastActivityLabel.value}`
);

const processingStatusMessage = computed(() => {
  if (processingPhase.value === "finalizing") {
    return "Conversion is running normally. FFmpeg is finishing the file.";
  }
  if (processingPhase.value === "packaging") {
    return "Conversion complete. Preparing your output file.";
  }
  if (processingPhase.value === "encoding") {
    return "FFmpeg is actively converting your media.";
  }
  if (processingPhase.value === "preparing") {
    return "Preparing FFmpeg...";
  }
  return "Converting media...";
});

const processingConfidenceCaption = computed(() => {
  void processingUiTick.value;
  if (processingPhase.value === "packaging") {
    return "Everything is on track.";
  }
  const lastActivityAt = processingLastActivityAtMs.value;
  if (!lastActivityAt) {
    return "Conversion has started.";
  }
  const seconds = Math.max(0, Math.floor((Date.now() - lastActivityAt) / 1000));
  return seconds < 10
    ? "Conversion is working fine."
    : "Conversion is still running (status updates may pause briefly).";
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
  processingProgressMode.value = hasTrimSelection.value ? "estimated" : "reliable";
  processingPhase.value = "preparing";
  processingActivityLine.value = null;
  processingStartedAtMs.value = Date.now();
  processingLastActivityAtMs.value = processingStartedAtMs.value;
  startProcessingUiTimer();
  processingError.value = null;
  clearOutput();
  cancelRequested.value = false;

  const onProgress: MediaProgressCallback = (progressEvent) => {
    markProcessingActivity();
    const normalized = Math.max(0, Math.min(100, Math.round(progressEvent.percent)));
    processingProgress.value = normalized;
    if (normalized > 0 && processingPhase.value === "preparing") {
      processingPhase.value = "encoding";
    }
    if (
      normalized >= 100 &&
      processingPhase.value !== "packaging" &&
      processingPhase.value !== "complete"
    ) {
      processingPhase.value = "finalizing";
    }

    const encodedSeconds = progressEvent.timeSeconds;
    if (
      typeof encodedSeconds === "number" &&
      Number.isFinite(encodedSeconds) &&
      encodedSeconds >= 0 &&
      !isDetailedProcessingActivityLine(processingActivityLine.value)
    ) {
      const encodedLabel = formatDurationClock(encodedSeconds, { includeTenths: true });
      const suffix =
        processingProgressMode.value === "estimated"
          ? normalized > 0
            ? ` • Estimate ${Math.min(99, normalized)}%`
            : ""
          : normalized > 0
            ? ` • ${Math.min(99, normalized)}%`
            : "";
      processingActivityLine.value = `Encoded ${encodedLabel}${suffix}`;
    }
  };
  const onLog: MediaLogCallback = (message) => {
    appendLog(message);
    markProcessingActivity();
    const summary = summarizeProcessingLogLine(message);
    if (summary) {
      const isGenericSummary = summary === "FFmpeg is processing the conversion...";
      if (
        !isGenericSummary ||
        !isDetailedProcessingActivityLine(processingActivityLine.value)
      ) {
        processingActivityLine.value = summary;
      }
      if (processingPhase.value === "preparing") {
        processingPhase.value = "encoding";
      }
    }
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

    processingPhase.value = "packaging";
    const finalName = ensureOutputFileName(outputFileName.value, file.name, outputFormat.value);
    outputFileName.value = finalName;
    const outputBlob = new Blob([payload], { type: outputMimeMap[outputFormat.value] });
    outputFileUrl.value = URL.createObjectURL(outputBlob);
    processingPhase.value = "complete";
    processingProgress.value = 100;
    appendLog(
      `[app] Output ready: ${finalName} (${(outputBlob.size / (1024 * 1024)).toFixed(2)} MB)`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Media conversion failed.";
    const normalizedMessage = message.toLowerCase();
    const wasCancelled =
      cancelRequested.value ||
      normalizedMessage.includes("cancelled") ||
      normalizedMessage.includes("canceled");
    if (wasCancelled) {
      ffmpegStatus.value = "idle";
      appendLog("[app] Conversion cancelled.");
    } else {
      processingError.value = message;
      appendLog(`[error] ${message}`);
    }
  } finally {
    processing.value = false;
    processingPhase.value = "idle";
    stopProcessingUiTimer();
    processingStartedAtMs.value = null;
    processingLastActivityAtMs.value = null;
    cancelRequested.value = false;
    convertAbortController = null;
  }
};

const cancelConversion = () => {
  if (!convertAbortController) {
    return;
  }
  cancelRequested.value = true;
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

watch(sourceFile, (file) => {
  clearPreviewDebounce();
  clearOutput();
  clearPreviewFrame();
  processingError.value = null;
  processingProgress.value = 0;
  isTrimRangeDragging.value = false;
  startSeconds.value = null;
  endSeconds.value = null;
  startTimeInput.value = "";
  endTimeInput.value = "";

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

watch(outputFormat, (format) => {
  clearOutput();
  if (!sourceFile.value) {
    outputFileName.value = "";
    return;
  }
  outputFileName.value = buildDefaultOutputName(sourceFile.value.name, format);
});

watch(targetSetupMode, (mode) => {
  if (mode === "preset") {
    applySelectedBoardPreset();
  }
  persistBoardSelection();
});

watch(selectedBoardPresetId, () => {
  if (targetSetupMode.value === "preset") {
    applySelectedBoardPreset();
  }
  persistBoardSelection();
});

watch([width, height, customBoardRoundDisplay], () => {
  if (targetSetupMode.value !== "custom") {
    return;
  }
  persistBoardSelection();
});

watch([customBoardWidth, customBoardHeight], () => {
  if (
    customBoardValidationMessage.value &&
    typeof customBoardWidth.value === "number" &&
    customBoardWidth.value > 0 &&
    typeof customBoardHeight.value === "number" &&
    customBoardHeight.value > 0
  ) {
    customBoardValidationMessage.value = null;
  }
});

watch(hasBoardSelection, (isReady) => {
  if (!isReady && activeNavigation.value === "workspace") {
    activeNavigation.value = "boards";
  }
});

onMounted(() => {
  const persistedBoardSelection = loadPersistedBoardSelection();
  if (persistedBoardSelection?.mode === "preset" && persistedBoardSelection.presetId) {
    targetSetupMode.value = "preset";
    selectedBoardPresetId.value = persistedBoardSelection.presetId;
    activeNavigation.value = "workspace";
  }
  if (
    persistedBoardSelection?.mode === "custom" &&
    typeof persistedBoardSelection.width === "number" &&
    typeof persistedBoardSelection.height === "number"
  ) {
    targetSetupMode.value = "custom";
    width.value = Math.max(1, Math.round(persistedBoardSelection.width));
    height.value = Math.max(1, Math.round(persistedBoardSelection.height));
    customBoardWidth.value = width.value;
    customBoardHeight.value = height.value;
    customBoardRoundDisplay.value = persistedBoardSelection.roundDisplay === true;
    activeNavigation.value = "workspace";
  }
  applySizingDefaults();
  const persistedPreferences = loadPersistedConversionPreferences();
  if (persistedPreferences) {
    outputFormat.value = persistedPreferences.outputFormat;
    orientation.value = persistedPreferences.orientation;
    scaleMode.value = persistedPreferences.scaleMode;
  }
  void initializeFfmpeg();
});

onBeforeUnmount(() => {
  if (convertAbortController) {
    convertAbortController.abort();
    convertAbortController = null;
  }
  stopProcessingUiTimer();
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

.preview-board-context {
  min-height: 48px;
  background: rgba(var(--v-theme-surface), 0.42);
  border-color: rgba(var(--v-theme-on-surface), 0.12) !important;
}

.preview-board-chip {
  font-weight: 600;
}

.workspace-section {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 0.42);
  box-shadow: inset 3px 0 0 rgba(var(--v-theme-primary), 0.32);
  padding: 14px;
}

.workspace-subsection {
  background: rgba(var(--v-theme-surface), 0.36);
  border-color: rgba(var(--v-theme-on-surface), 0.1) !important;
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

.preview-time-card__body {
  padding: 10px 14px 8px !important;
}

.preview-time-card__header {
  min-height: 20px;
  margin-bottom: 2px;
}

.preview-time-card--inactive {
  background: rgba(var(--v-theme-surface), 0.32);
}

.preview-position-slider {
  margin-top: -2px;
  margin-bottom: -6px;
}

.preview-position-slider :deep(.v-slider-track__container) {
  height: 4px;
}

.preview-position-slider :deep(.v-slider-thumb__surface) {
  width: 14px;
  height: 14px;
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

.processing-activity-line {
  word-break: break-word;
}

.processing-confidence-line {
  font-weight: 600;
}

@media (max-width: 959px) {
  .app-nav-target {
    scroll-margin-top: 84px;
  }

  .preview-board-context .v-btn {
    width: 100%;
  }
}
</style>
