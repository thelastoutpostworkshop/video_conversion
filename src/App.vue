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
      <div v-if="hasBoardSelection" class="app-bar-display mr-2">
        <div class="app-bar-display__label text-caption text-medium-emphasis">Display</div>
        <v-chip
          color="info"
          variant="tonal"
          size="small"
          class="app-bar-display__chip"
        >
          {{ workspaceBoardSummary }}
        </v-chip>
        <v-btn
          v-if="activeView !== 'boards'"
          size="small"
          variant="tonal"
          prepend-icon="mdi-view-grid-outline"
          :disabled="processing"
          class="app-bar-display__action"
          @click="navigateToView('boards')"
        >
          Change board
        </v-btn>
      </div>
      <v-btn
        :icon="themeToggleIcon"
        variant="text"
        :aria-label="themeToggleLabel"
        :title="themeToggleLabel"
        @click="toggleTheme"
      />
    </v-app-bar>

    <v-main class="app-main">
      <v-container fluid class="app-main-container py-6">
        <v-row class="app-main-row">
          <v-col cols="12" class="app-main-column">
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

                <v-row density="comfortable" class="workspace-body-grid">
                  <v-col cols="12" lg="4">
                    <TrimVideoPlayer
                      v-model:trim-range="trimRangeModel"
                      :source-file="sourceFile"
                      :source-proxy-url="sourcePreviewProxyUrl"
                      :source-proxy-busy="sourcePreviewProxyBusy"
                      :source-proxy-error="sourcePreviewProxyError"
                      :is-video-source="isVideoSource"
                      :is-video-output="isVideoOutput"
                      :prefer-native-source-picker="isElectronApp"
                      :duration-seconds="sourceDurationSeconds ?? trimPlayerDurationSeconds"
                      :preview-frame-busy="previewFrameBusy"
                      :motion-preview-busy="previewMotionBusy"
                      :start-time-input="startTimeInput"
                      :end-time-input="endTimeInput"
                      :start-time-input-invalid="startTimeInputInvalid"
                      :end-time-input-invalid="endTimeInputInvalid"
                      :disabled="processing"
                      @current-time-update="onTrimPlayerCurrentTimeUpdate"
                      @preview-time-request="syncOutputPreviewToTime"
                      @request-playable-preview="generateSourcePreviewProxy"
                      @request-native-source-file="requestNativeSourceFile"
                      @select-source-file="onSourceFileSelected"
                      @update:start-time-input="(value) => (startTimeInput = value)"
                      @update:end-time-input="(value) => (endTimeInput = value)"
                      @commit-start-time-input="onStartTimeInputCommit"
                      @commit-end-time-input="onEndTimeInputCommit"
                      @duration-detected="onTrimPlayerDurationDetected"
                    >
                      <template #footer>
                        <div id="section-export" class="app-nav-target" />
                        <div class="step-heading mb-2">
                          <div class="text-subtitle-1 font-weight-medium">
                            {{ outputWorkflowHeading }}
                          </div>
                        </div>

                        <v-row density="comfortable">
                          <v-col cols="12">
                            <v-text-field
                              v-model="outputFileBaseName"
                              label="Output file name"
                              density="comfortable"
                              persistent-hint
                              :disabled="processing"
                            >
                              <template #append-inner>
                                <span class="output-file-name-extension">.{{ outputFileExtension }}</span>
                              </template>
                            </v-text-field>
                          </v-col>
                        </v-row>

                        <div class="d-flex flex-wrap ga-2 mt-2">
                          <v-btn
                            color="primary"
                            :loading="processing"
                            :disabled="!canConvert"
                            @click="runConversion"
                          >
                            {{ processing ? "Converting..." : "Convert" }}
                          </v-btn>
                        </div>

                        <v-alert
                          v-if="hasOutput"
                          type="success"
                          variant="tonal"
                          class="mt-3"
                        >
                          <div class="d-flex flex-wrap align-center ga-2">
                            <div class="text-body-2">
                              {{ outputReadyInlineMessage }}
                              <strong>{{ outputFileName }}</strong>
                              <span v-if="outputSavedPath">
                                . Open it in its folder whenever you need it.
                              </span>
                              <span v-else>
                                before you leave or refresh this page.
                              </span>
                            </div>
                            <v-spacer />
                            <v-btn
                              size="small"
                              color="success"
                              variant="flat"
                              class="output-ready-action-btn"
                              @click="downloadOutput"
                            >
                              {{ outputPrimaryActionLabel }}
                            </v-btn>
                          </div>
                        </v-alert>

                        <v-alert
                          v-if="processingError"
                          type="error"
                          variant="tonal"
                          class="mt-3"
                        >
                          {{ processingError }}
                        </v-alert>
                      </template>
                    </TrimVideoPlayer>
                  </v-col>

                  <v-col cols="12" lg="8">
                    <v-sheet class="workspace-preview-panel pa-3" rounded="0" border>
                      <div class="workspace-preview-panel__header mb-3">
                        <div class="workspace-preview-panel__header-copy">
                          <div class="workspace-preview-panel__title">
                            Conversion settings
                          </div>
                        </div>
                      </div>

                      <div class="workspace-preview-settings">

                        <v-row density="comfortable" class="workspace-preview-settings__grid">
                          <v-col cols="12" md="4">
                            <v-select
                              v-model="outputFormat"
                              :items="formatItems"
                              item-title="title"
                              item-value="value"
                              label="Output format"
                              density="compact"
                              hide-details="auto"
                              :disabled="processing || previewFrameBusy || previewMotionBusy"
                            />
                          </v-col>

                          <template v-if="isVideoOutput">
                            <v-col cols="12" sm="6" md="4">
                              <v-select
                                v-model="orientation"
                                :items="orientationItems"
                                item-title="title"
                                item-value="value"
                                label="Orientation"
                                density="compact"
                                hide-details="auto"
                                :disabled="processing"
                              />
                            </v-col>
                            <v-col cols="12" sm="6" md="4">
                              <v-select
                                v-model="scaleMode"
                                :items="scaleModeItems"
                                item-title="title"
                                item-value="value"
                                label="Scale mode"
                                density="compact"
                                hide-details="auto"
                                :disabled="processing || outputSizeMode !== 'custom'"
                              />
                            </v-col>
                            <v-col cols="12" lg="8">
                              <div class="workspace-preview-settings__crop">
                                <div class="workspace-preview-settings__crop-row">
                                  <v-switch
                                    v-model="customCropEnabled"
                                    color="primary"
                                    density="compact"
                                    label="Custom crop"
                                    hide-details
                                    inset
                                    :disabled="processing || !supportsCustomCrop"
                                  />
                                  <v-btn
                                    v-if="customCropEnabled"
                                    size="x-small"
                                    variant="tonal"
                                    prepend-icon="mdi-crop-free"
                                    :disabled="processing || !canResetCustomCrop"
                                    @click="resetCustomCropRect"
                                  >
                                    Reset crop
                                  </v-btn>
                                </div>
                                <div class="text-caption text-medium-emphasis workspace-preview-settings__crop-copy">
                                  {{ customCropEnabled ? customCropSummary : customCropHint }}
                                </div>
                              </div>
                            </v-col>
                            <v-col cols="6" sm="3" lg="2">
                              <v-text-field
                                :model-value="fps"
                                label="FPS"
                                type="number"
                                density="compact"
                                hide-details="auto"
                                :disabled="processing"
                                @update:model-value="(value) => (fps = toNullableNumber(value))"
                              />
                            </v-col>
                            <v-col cols="6" sm="3" lg="2">
                              <v-text-field
                                :model-value="quality"
                                label="Quality"
                                type="number"
                                density="compact"
                                hide-details="auto"
                                title="Lower number = higher quality."
                                :disabled="processing"
                                @update:model-value="(value) => (quality = toNullableNumber(value))"
                              />
                            </v-col>
                          </template>

                          <v-col v-else cols="12" sm="6" md="4">
                            <v-text-field
                              :model-value="mp3Bitrate"
                              label="MP3 bitrate (kbps)"
                              type="number"
                              density="compact"
                              hide-details="auto"
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
                          density="compact"
                          class="mt-2"
                        >
                          {{ trimValidationMessage }}
                        </v-alert>
                      </div>

                      <div class="workspace-preview-panel__preview mt-4">
                        <div class="workspace-section-label">Preview</div>

                        <div class="workspace-preview-panel__surface">
                          <PreviewFrameSurface
                            :preview-frame-url="previewFrameUrl"
                            :preview-frame-busy="previewFrameBusy"
                            :has-source-file="Boolean(sourceFile)"
                            :is-video-source="isVideoSource"
                            :is-video-output="isVideoOutput"
                            :round-display="workspaceRoundDisplay"
                            :target-width="previewTargetDimensions?.width ?? null"
                            :target-height="previewTargetDimensions?.height ?? null"
                            :crop-enabled="customCropEnabled && supportsCustomCrop"
                            :crop-rect="customCropRect"
                            :crop-aspect-ratio="customCropTargetAspectRatio"
                            :crop-interactive="
                              customCropEnabled &&
                              supportsCustomCrop &&
                              !processing &&
                              !previewFrameBusy
                            "
                            @update:crop-rect="onCustomCropRectUpdate"
                            @update:crop-preview-applied="onCropPreviewAppliedUpdate"
                          />
                        </div>

                        <v-alert
                          v-if="activePreviewPanelError"
                          type="warning"
                          variant="tonal"
                        >
                          {{ activePreviewPanelError }}
                        </v-alert>

                        <v-alert
                          v-if="previewMotionError && !motionPreviewDialogOpen"
                          type="warning"
                          variant="tonal"
                        >
                          {{ previewMotionError }}
                        </v-alert>

                        <div class="workspace-preview-panel__footer">
                          <div class="workspace-preview-panel__meta">
                            <div class="workspace-preview-panel__meta-summary">
                              <div class="workspace-section-label">
                                {{ activePreviewPanelTitle }}
                              </div>
                              <div class="text-body-2 workspace-preview-panel__meta-status">
                                {{ activePreviewPanelStatus }}
                              </div>
                            </div>
                            <div class="text-caption text-medium-emphasis workspace-preview-panel__helper">
                              {{ activePreviewPanelHelper }}
                            </div>
                          </div>

                          <div class="workspace-preview-panel__toolbar">
                            <v-btn
                              v-if="showFramePreviewAction"
                              size="small"
                              variant="tonal"
                              color="info"
                              prepend-icon="mdi-image-sync-outline"
                              :loading="previewFrameBusy"
                              :disabled="!canRefreshFramePreviewFromPanel"
                              @click="requestFramePreviewFromPanel"
                            >
                              Update frame preview
                            </v-btn>

                            <v-btn
                              v-if="showMotionPreviewAction"
                              size="small"
                              variant="tonal"
                              color="secondary"
                              prepend-icon="mdi-play-circle-outline"
                              :loading="previewMotionBusy"
                              :disabled="!canGenerateMotionPreviewFromPanel"
                              @click="requestMotionPreviewFromPanel"
                            >
                              {{ motionPreviewActionLabel }}
                            </v-btn>

                            <v-tooltip
                              v-if="showPreviewDownloadAction"
                              text="Download preview image"
                              location="top"
                            >
                              <template #activator="{ props: tooltipProps }">
                                <v-btn
                                  v-bind="tooltipProps"
                                  size="small"
                                  variant="tonal"
                                  icon
                                  color="primary"
                                  :disabled="!canDownloadPreviewImage"
                                  aria-label="Download preview image"
                                  @click="downloadPreviewImage"
                              >
                                <v-icon icon="mdi-file-download-outline" size="18" />
                              </v-btn>
                            </template>
                          </v-tooltip>
                        </div>
                      </div>
                    </div>
                    </v-sheet>
                  </v-col>
                </v-row>

              </section>
            </div>
            <v-card
              v-else-if="activeView === 'logs'"
              rounded="lg"
              elevation="4"
              class="panel-card logs-view-card"
            >
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

    <v-dialog v-model="motionPreviewDialogOpen" max-width="980">
      <v-card class="motion-preview-dialog" rounded="0">
        <v-card-title class="motion-preview-dialog__header">
          <div>
            <div class="text-overline text-medium-emphasis">Motion preview</div>
            <div class="text-subtitle-2">{{ motionPreviewDialogStatus }}</div>
          </div>

          <v-spacer />

          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            aria-label="Close motion preview"
            @click="motionPreviewDialogOpen = false"
          />
        </v-card-title>

        <v-card-text class="motion-preview-dialog__body">
          <div
            v-if="customCropEnabled && supportsCustomCrop"
            class="motion-preview-dialog__context mb-3"
          >
            <v-chip size="small" variant="tonal" color="secondary">
              Custom crop applied
            </v-chip>
          </div>

          <div class="text-caption text-medium-emphasis mb-3 motion-preview-dialog__helper">
            Uses the current trim window and the active display settings.
          </div>

          <PreviewMotionSurface
            :preview-motion-url="previewMotionUrl"
            :preview-motion-busy="previewMotionBusy"
            :has-source-file="Boolean(sourceFile)"
            :is-video-source="isVideoSource"
            :is-video-output="isVideoOutput"
            :round-display="workspaceRoundDisplay"
            :target-width="previewTargetDimensions?.width ?? null"
            :target-height="previewTargetDimensions?.height ?? null"
          />

          <v-alert
            v-if="previewMotionError"
            type="warning"
            variant="tonal"
            class="mt-3"
          >
            {{ previewMotionError }}
          </v-alert>
        </v-card-text>
      </v-card>
    </v-dialog>

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

    <v-dialog v-model="downloadReadyDialogOpen" max-width="520">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-check-circle" color="success" />
          <span>{{ outputReadyDialogTitle }}</span>
        </v-card-title>
        <v-card-text>
          <div class="text-body-2">
            {{ outputReadyDialogMessage }}
            <strong>{{ outputFileName }}</strong>
            <span v-if="outputSavedPath"> to the location you selected.</span>
            <span v-else> now so it does not get lost if you leave or refresh this page.</span>
          </div>
          <div v-if="outputSavedPath" class="text-caption text-medium-emphasis mt-2">
            {{ outputSavedPath }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="downloadReadyDialogOpen = false">
            {{ outputSecondaryActionLabel }}
          </v-btn>
          <v-btn
            color="success"
            variant="flat"
            class="output-ready-action-btn"
            @click="downloadOutput"
          >
            {{ outputPrimaryActionLabel }}
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
import PreviewMotionSurface from "@/components/PreviewMotionSurface.vue";
import TrimVideoPlayer from "@/components/TrimVideoPlayer.vue";
import type {
  AudioTranscodeOptions,
  MediaLogCallback,
  MediaProgressCallback,
  MediaProcessingResult,
  VideoCropRegion,
  VideoOrientation,
  VideoScaleMode,
  VideoTranscodeOptions,
} from "@/services/MediaProcessingService";
import { getElectronFilePath, registerElectronFilePath } from "@/services/electronFileRegistry";
import { mediaProcessingService } from "@/services/mediaProcessingServiceInstance";
import { getMediaBackendLabel, isElectronRuntime } from "@/services/runtimeEnvironment";
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

const isElectronApp = ref(isElectronRuntime());
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

interface PersistedCustomBoardDraft {
  width: number | null;
  height: number | null;
  roundDisplay: boolean;
}

interface PersistedConversionPreferences {
  outputFormat: OutputFormat;
}

interface PersistedDisplayConversionSettings {
  orientation: VideoOrientation;
  scaleMode: VideoScaleMode;
  fps: number | null;
  quality: number | null;
}

interface NormalizedCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
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
  { id: "workspace", title: "Video conversion", icon: "mdi-file-cog-outline" },
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
const customBoardDraftStorageKey = "video-conversion.custom-board-draft.v1";
const displayConversionSettingsStorageKey = "video-conversion.display-settings.v1";

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

const defaultDisplayConversionSettings: PersistedDisplayConversionSettings = {
  orientation: "none",
  scaleMode: "fit",
  fps: 20,
  quality: 5,
};

const outputFileUrl = ref<string | null>(null);
const outputSavedPath = ref<string | null>(null);

const outputFormat = ref<OutputFormat>("gif");
const outputFileName = ref("");
const outputSizeMode = ref<OutputSizeMode>("custom");
const width = ref<number | null>(null);
const height = ref<number | null>(null);
const scaleMode = ref<VideoScaleMode>("fit");
const customCropEnabled = ref(false);
const customCropRect = ref<NormalizedCropRect | null>(null);
const customCropPreviewApplied = ref(false);
const orientation = ref<VideoOrientation>("none");
const fps = ref<number | null>(20);
const quality = ref<number | null>(5);
const startSeconds = ref<number | null>(null);
const endSeconds = ref<number | null>(null);
const startTimeInput = ref("");
const endTimeInput = ref("");
const mp3Bitrate = ref<number | null>(128);
const targetSetupMode = ref<TargetSetupMode>("preset");
const selectedBoardPresetId = ref<string>("");
const customBoardWidth = ref<number | null>(null);
const customBoardHeight = ref<number | null>(null);
const customBoardRoundDisplay = ref(false);
const customBoardValidationMessage = ref<string | null>(null);
const activeNavigation = ref<AppNavigationId>("boards");

const toRoundedPositiveDimension = (value: number | null): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.max(1, Math.round(value));
};

const theme = useTheme();

const {
  sourceFile,
  isVideoSource,
  sourceMetadata,
  sourceMetadataLoading,
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
const downloadReadyDialogOpen = ref(false);
const logLines = ref<string[]>([]);

let convertAbortController: AbortController | null = null;
let processingUiTimer: ReturnType<typeof setInterval> | null = null;
const cancelRequested = ref(false);
const initializePreviewAtMidpointPending = ref(false);
const trimPlayerDurationSeconds = ref<number | null>(null);
const previewMotionUrl = ref<string | null>(null);
const previewMotionBusy = ref(false);
const previewMotionError = ref<string | null>(null);
const previewMotionStartSeconds = ref<number | null>(null);
const previewMotionDurationSeconds = ref<number | null>(null);
const motionPreviewDialogOpen = ref(false);
const trimPlayerCurrentSeconds = ref(0);
const sourcePreviewProxyUrl = ref<string | null>(null);
const sourcePreviewProxyBusy = ref(false);
const sourcePreviewProxyError = ref<string | null>(null);
const previewJobsBusy = computed(
  () => previewMotionBusy.value || sourcePreviewProxyBusy.value
);

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

const canUseCustomBoardRoundDisplay = computed(() => {
  const customWidth = toRoundedPositiveDimension(customBoardWidth.value);
  const customHeight = toRoundedPositiveDimension(customBoardHeight.value);
  return customWidth !== null && customHeight !== null && customWidth === customHeight;
});

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

const currentDisplaySettingsKey = computed(() => {
  if (targetSetupMode.value === "preset" && selectedBoardPreset.value) {
    return `preset:${selectedBoardPreset.value.id}`;
  }
  if (
    targetSetupMode.value === "custom" &&
    hasCustomBoardDimensions.value &&
    width.value &&
    height.value
  ) {
    return `custom:${Math.round(width.value)}x${Math.round(height.value)}:${
      customBoardRoundDisplay.value ? "round" : "rect"
    }`;
  }
  return null;
});

const hasOutput = computed(
  () => Boolean(outputFileUrl.value) || Boolean(outputSavedPath.value)
);
const outputFileExtension = computed(() => outputExtensionMap[outputFormat.value]);
const outputReadyDialogTitle = computed(() =>
  outputSavedPath.value ? "Output saved" : "Output ready to download"
);
const outputReadyDialogMessage = computed(() =>
  outputSavedPath.value
    ? "Your conversion finished successfully and saved"
    : "Your conversion finished successfully. Download"
);
const outputReadyInlineMessage = computed(() =>
  outputSavedPath.value ? "Your output is ready." : "Your output is ready. Download "
);
const outputPrimaryActionLabel = computed(() =>
  outputSavedPath.value ? "Open folder" : "Download now"
);
const outputSecondaryActionLabel = computed(() =>
  outputSavedPath.value ? "Close" : "Later"
);
const outputWorkflowHeading = computed(() =>
  isElectronApp.value ? "Convert and save" : "Convert and download"
);

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

const onStartTimeInputCommit = () => {
  if (!commitStartTimeInput()) {
    return;
  }
  if (typeof startSeconds.value === "number") {
    syncOutputPreviewToTime(startSeconds.value);
  }
};

const onEndTimeInputCommit = () => {
  if (!commitEndTimeInput()) {
    return;
  }
  if (typeof endSeconds.value === "number") {
    syncOutputPreviewToTime(endSeconds.value);
  }
};

const trimRangeMax = computed(
  () => sourceDurationSeconds.value ?? trimPlayerDurationSeconds.value ?? previewSecondsMax.value
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

const orientedSourceDimensions = computed<{ width: number; height: number } | null>(() => {
  const metadata = sourceMetadata.value;
  if (!metadata) {
    return null;
  }

  let orientedWidth = metadata.width;
  let orientedHeight = metadata.height;
  if (orientation.value === "cw90" || orientation.value === "ccw90") {
    const swappedWidth = orientedHeight;
    orientedHeight = orientedWidth;
    orientedWidth = swappedWidth;
  }
  return {
    width: orientedWidth,
    height: orientedHeight,
  };
});

const customCropTargetAspectRatio = computed<number | null>(() => {
  const target = previewTargetDimensions.value;
  if (!target || target.width <= 0 || target.height <= 0) {
    return null;
  }
  return target.width / target.height;
});

const supportsCustomCrop = computed(
  () =>
    isVideoOutput.value &&
    outputSizeMode.value === "custom" &&
    scaleMode.value === "fill" &&
    Boolean(orientedSourceDimensions.value) &&
    Boolean(customCropTargetAspectRatio.value)
);

const previewOutputSizeMode = computed<OutputSizeMode>(() =>
  customCropEnabled.value && supportsCustomCrop.value ? "original" : outputSizeMode.value
);

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

const normalizeCropRect = (rect: NormalizedCropRect): NormalizedCropRect => {
  const minSize = 0.02;
  const constrainedWidth = Math.min(1, Math.max(minSize, clampUnit(rect.width)));
  const constrainedHeight = Math.min(1, Math.max(minSize, clampUnit(rect.height)));
  return {
    x: Math.min(1 - constrainedWidth, clampUnit(rect.x)),
    y: Math.min(1 - constrainedHeight, clampUnit(rect.y)),
    width: constrainedWidth,
    height: constrainedHeight,
  };
};

const createCenteredCropRect = (
  sourceWidth: number,
  sourceHeight: number,
  targetAspectRatio: number
): NormalizedCropRect => {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    !Number.isFinite(targetAspectRatio) ||
    targetAspectRatio <= 0
  ) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const sourceAspect = sourceWidth / sourceHeight;
  let cropWidth = 1;
  let cropHeight = 1;
  if (sourceAspect > targetAspectRatio) {
    cropWidth = targetAspectRatio / sourceAspect;
  } else {
    cropHeight = sourceAspect / targetAspectRatio;
  }
  return normalizeCropRect({
    x: (1 - cropWidth) / 2,
    y: (1 - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  });
};

const toPixelCropRegion = (
  rect: NormalizedCropRect,
  dimensions: { width: number; height: number }
): VideoCropRegion => {
  const sourceWidth = Math.max(1, Math.round(dimensions.width));
  const sourceHeight = Math.max(1, Math.round(dimensions.height));
  const normalized = normalizeCropRect(rect);
  const cropWidth = Math.max(1, Math.min(sourceWidth, Math.round(normalized.width * sourceWidth)));
  const cropHeight = Math.max(
    1,
    Math.min(sourceHeight, Math.round(normalized.height * sourceHeight))
  );
  const cropX = Math.max(0, Math.min(sourceWidth - cropWidth, Math.round(normalized.x * sourceWidth)));
  const cropY = Math.max(
    0,
    Math.min(sourceHeight - cropHeight, Math.round(normalized.y * sourceHeight))
  );
  return {
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  };
};

const resetCustomCropRect = () => {
  const dimensions = orientedSourceDimensions.value;
  const targetAspectRatio = customCropTargetAspectRatio.value;
  if (!dimensions || !targetAspectRatio) {
    customCropRect.value = null;
    return;
  }
  customCropRect.value = createCenteredCropRect(
    dimensions.width,
    dimensions.height,
    targetAspectRatio
  );
};

const onCustomCropRectUpdate = (rect: NormalizedCropRect) => {
  customCropRect.value = normalizeCropRect(rect);
};

const onCropPreviewAppliedUpdate = (applied: boolean) => {
  customCropPreviewApplied.value = applied;
};

const activeCustomCropRegion = computed<VideoCropRegion | null>(() => {
  if (!customCropEnabled.value || !supportsCustomCrop.value || !customCropRect.value) {
    return null;
  }
  const dimensions = orientedSourceDimensions.value;
  if (!dimensions) {
    return null;
  }
  return toPixelCropRegion(customCropRect.value, dimensions);
});

const customCropSummary = computed(() => {
  const region = activeCustomCropRegion.value;
  if (!region) {
    return "Adjust the crop box in the preview.";
  }
  return `Crop: ${region.width}x${region.height} at ${region.x}, ${region.y}`;
});

const canResetCustomCrop = computed(() => Boolean(supportsCustomCrop.value && customCropRect.value));

const customCropHint = computed(() => {
  if (scaleMode.value !== "fill") {
    return "Use Fill (crop) to enable custom crop.";
  }
  if (!supportsCustomCrop.value) {
    return "Load a video and use a custom target size.";
  }
  return "Turn on custom crop, then adjust the box in the preview.";
});

const canConvert = computed(() => {
  if (!hasBoardSelection.value) {
    return false;
  }
  if (!sourceFile.value || processing.value || previewFrameBusy.value || previewJobsBusy.value) {
    return false;
  }
  if (hasTrimInputError.value) {
    return false;
  }
  if (hasRangeError.value) {
    return false;
  }
  if (outputSizeMode.value === "custom" && isVideoOutput.value) {
    const hasTargetDimensions = Boolean(width.value && width.value > 0 && height.value && height.value > 0);
    if (!hasTargetDimensions) {
      return false;
    }
  }
  if (customCropEnabled.value && supportsCustomCrop.value && !activeCustomCropRegion.value) {
    return false;
  }
  return true;
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

const getElectronMediaApi = () => window.electronMedia ?? null;

const serializeElectronInputFile = async (
  file: File
): Promise<ElectronSerializedInputFile> => ({
  name: file.name,
  type: file.type,
  lastModified: file.lastModified,
  ...(getElectronFilePath(file)
    ? { path: getElectronFilePath(file) ?? undefined }
    : { data: await file.arrayBuffer() }),
});

const tryRegisterNativeFilePath = (file: File) => {
  const maybePath = (file as File & { path?: unknown }).path;
  if (typeof maybePath === "string" && maybePath.trim().length > 0) {
    registerElectronFilePath(file, maybePath);
  }
};

const onSourceFileSelected = (file: File) => {
  tryRegisterNativeFilePath(file);
  sourceFile.value = file;
};

const requestNativeSourceFile = async () => {
  if (!isElectronApp.value || !window.electronMedia) {
    return;
  }
  const result = await window.electronMedia.pickSourceFile();
  if (result.canceled || !result.file) {
    return;
  }
  const pickedFile = result.file;
  const file = new File([pickedFile.data], pickedFile.name, {
    type: pickedFile.type,
    lastModified: pickedFile.lastModified,
  });
  registerElectronFilePath(file, pickedFile.path);
  onSourceFileSelected(file);
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

const parsePersistedNullableNumber = (value: unknown): number | null | "invalid" => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return "invalid";
};

const normalizePersistedDisplayConversionSettings = (
  value: unknown
): PersistedDisplayConversionSettings | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const parsed = value as Record<string, unknown>;
  const orientationValue = parsed.orientation;
  const scaleModeValue = parsed.scaleMode;
  const fpsValue = parsePersistedNullableNumber(parsed.fps);
  const qualityValue = parsePersistedNullableNumber(parsed.quality);
  if (
    !isVideoOrientation(orientationValue) ||
    !isVideoScaleMode(scaleModeValue) ||
    fpsValue === "invalid" ||
    qualityValue === "invalid"
  ) {
    return null;
  }
  return {
    orientation: orientationValue,
    scaleMode: scaleModeValue,
    fps: fpsValue,
    quality: qualityValue,
  };
};

const loadPersistedDisplayConversionSettingsMap = (): Record<
  string,
  PersistedDisplayConversionSettings
> => {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(displayConversionSettingsStorageKey);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: Record<string, PersistedDisplayConversionSettings> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const settings = normalizePersistedDisplayConversionSettings(value);
      if (settings) {
        normalized[key] = settings;
      }
    }
    return normalized;
  } catch {
    return {};
  }
};

const loadPersistedDisplayConversionSettings = (
  key: string | null
): PersistedDisplayConversionSettings | null => {
  if (!key) {
    return null;
  }
  const settings = loadPersistedDisplayConversionSettingsMap()[key];
  return settings ?? null;
};

const persistDisplayConversionSettings = (
  key: string,
  settings: PersistedDisplayConversionSettings
) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const persistedSettings = loadPersistedDisplayConversionSettingsMap();
    persistedSettings[key] = settings;
    window.localStorage.setItem(
      displayConversionSettingsStorageKey,
      JSON.stringify(persistedSettings)
    );
  } catch {
    // Ignore storage errors.
  }
};

const applyDisplayConversionSettings = (settings: PersistedDisplayConversionSettings) => {
  orientation.value = settings.orientation;
  scaleMode.value = settings.scaleMode;
  fps.value = settings.fps;
  quality.value = settings.quality;
};

let suppressDisplaySettingsPersistence = false;

const withDisplaySettingsPersistenceSuppressed = (callback: () => void) => {
  suppressDisplaySettingsPersistence = true;
  try {
    callback();
  } finally {
    suppressDisplaySettingsPersistence = false;
  }
};

const persistConversionPreferences = () => {
  if (typeof window === "undefined") {
    return;
  }
  const preferences: PersistedConversionPreferences = {
    outputFormat: outputFormat.value,
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
    if (!isOutputFormat(outputFormatValue)) {
      return null;
    }
    return {
      outputFormat: outputFormatValue,
    };
  } catch {
    return null;
  }
};

const persistCustomBoardDraft = () => {
  if (typeof window === "undefined") {
    return;
  }
  const payload: PersistedCustomBoardDraft = {
    width:
      typeof customBoardWidth.value === "number" &&
      Number.isFinite(customBoardWidth.value) &&
      customBoardWidth.value > 0
        ? customBoardWidth.value
        : null,
    height:
      typeof customBoardHeight.value === "number" &&
      Number.isFinite(customBoardHeight.value) &&
      customBoardHeight.value > 0
        ? customBoardHeight.value
        : null,
    roundDisplay: customBoardRoundDisplay.value,
  };
  try {
    window.localStorage.setItem(customBoardDraftStorageKey, JSON.stringify(payload));
  } catch {
    // Ignore storage errors.
  }
};

const loadPersistedCustomBoardDraft = (): PersistedCustomBoardDraft | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(customBoardDraftStorageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const widthValue =
      typeof parsed.width === "number" && Number.isFinite(parsed.width) && parsed.width > 0
        ? parsed.width
        : null;
    const heightValue =
      typeof parsed.height === "number" && Number.isFinite(parsed.height) && parsed.height > 0
        ? parsed.height
        : null;
    return {
      width: widthValue,
      height: heightValue,
      roundDisplay: parsed.roundDisplay === true,
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
  const persistedSettings = loadPersistedDisplayConversionSettings(
    currentDisplaySettingsKey.value
  );
  withDisplaySettingsPersistenceSuppressed(() => {
    applyTargetProfile(preset, options);
    if (persistedSettings) {
      applyDisplayConversionSettings(persistedSettings);
    }
  });
};

const applySelectedCustomDisplaySettings = () => {
  const key = currentDisplaySettingsKey.value;
  if (!key) {
    return;
  }
  const persistedSettings =
    loadPersistedDisplayConversionSettings(key) ?? defaultDisplayConversionSettings;
  withDisplaySettingsPersistenceSuppressed(() => {
    applyDisplayConversionSettings(persistedSettings);
  });
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
  applySelectedCustomDisplaySettings();
  persistBoardSelection();
  appendLog(
    `[app] Using custom board target ${width.value}x${height.value}${
      customBoardRoundDisplay.value ? " (round screen)." : "."
    }`
  );
  activeNavigation.value = "workspace";
};

const maxLogLineCount = 300;
const ffmpegProgressLogThrottleMs = 350;

const appendLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  const entry = `[${timestamp}] ${message}`;
  logLines.value.push(entry);
  if (logLines.value.length > maxLogLineCount) {
    logLines.value.splice(0, logLines.value.length - maxLogLineCount);
  }
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

const isHighFrequencyFfmpegProgressLine = (message: string): boolean => {
  if (!message || !message.trim()) {
    return false;
  }
  const normalized = message
    .replace(/^\[(?:stderr|stdout|fferr|ffout)\]\s*/i, "")
    .replace(/[ \t]+/g, " ")
    .trim();
  return /\bframe=\s*\d+\b/i.test(normalized) || /\btime=\s*[^\s]+\b/i.test(normalized);
};

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
  outputSavedPath.value = null;
  downloadReadyDialogOpen.value = false;
};

const fileBaseName = (name: string) => {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.slice(0, dotIndex) : name;
};

const fileNameFromPath = (rawPath: string) => {
  const normalized = rawPath.trim();
  if (!normalized) {
    return "";
  }
  const segments = normalized.split(/[\\/]/);
  return segments[segments.length - 1] ?? normalized;
};

const extractOutputBaseName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return fileBaseName(trimmed).trim();
};

const normalizeOutputBaseNameInput = (value: string, format: OutputFormat) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const requiredExtension = `.${outputExtensionMap[format]}`;
  if (trimmed.toLowerCase().endsWith(requiredExtension)) {
    return trimmed.slice(0, trimmed.length - requiredExtension.length).trim();
  }
  return trimmed;
};

const buildOutputFileName = (baseName: string, format: OutputFormat) =>
  `${normalizeOutputBaseNameInput(baseName, format) || "output"}.${outputExtensionMap[format]}`;

const createPreviewFileName = () => {
  const sourceName = sourceFile.value?.name ?? "preview";
  const previewSeconds = Math.max(0, previewSecondModel.value);
  const secondsLabel = previewSeconds.toFixed(1).replace(".", "p");
  return `${fileBaseName(sourceName)}-preview-${secondsLabel}s.png`;
};

const buildDefaultOutputName = (name: string, format: OutputFormat) =>
  buildOutputFileName(extractOutputBaseName(name), format);

const outputSaveFilters: Record<
  OutputFormat,
  Array<{ name: string; extensions: string[] }>
> = {
  gif: [{ name: "GIF files", extensions: ["gif"] }],
  mjpeg: [{ name: "MJPEG files", extensions: ["mjpeg"] }],
  avi: [{ name: "AVI files", extensions: ["avi"] }],
  mp3: [{ name: "MP3 files", extensions: ["mp3"] }],
};

const ensureOutputFileName = (
  raw: string,
  sourceName: string,
  format: OutputFormat
) => {
  const fallback = buildDefaultOutputName(sourceName, format);
  const normalizedBaseName = normalizeOutputBaseNameInput(raw, format);
  if (!normalizedBaseName) {
    return fallback;
  }
  return buildOutputFileName(normalizedBaseName, format);
};

const resolveElectronOutputSavePath = async (
  defaultFileName: string,
  format: OutputFormat
): Promise<string | null> => {
  const electronMedia = getElectronMediaApi();
  if (!electronMedia) {
    return null;
  }
  const result =
    (await electronMedia.pickSavePath({
      defaultPath: defaultFileName,
      filters: outputSaveFilters[format],
    })) as ElectronPickSavePathResult;
  if (result.canceled || !result.path) {
    return null;
  }
  return result.path;
};

const outputFileBaseName = computed({
  get: () => {
    const normalizedBaseName = extractOutputBaseName(outputFileName.value);
    if (normalizedBaseName) {
      return normalizedBaseName;
    }
    if (sourceFile.value) {
      return fileBaseName(sourceFile.value.name);
    }
    return "";
  },
  set: (value: string) => {
    const fallbackBaseName = sourceFile.value ? fileBaseName(sourceFile.value.name) : "output";
    const normalizedBaseName = normalizeOutputBaseNameInput(value, outputFormat.value);
    outputFileName.value = buildOutputFileName(
      normalizedBaseName || fallbackBaseName,
      outputFormat.value
    );
  },
});

const initializeFfmpeg = async (): Promise<boolean> => {
  refreshElectronRuntimeState();
  if (ffmpegStatus.value === "ready") {
    return true;
  }
  if (ffmpegStatus.value === "loading") {
    return false;
  }
  ffmpegStatus.value = "loading";
  processingError.value = null;
  appendLog(`[app] Backend selected: ${getMediaBackendLabel()}.`);
  appendLog("[app] Loading FFmpeg backend...");
  try {
    await mediaProcessingService.ensureReady();
    ffmpegStatus.value = "ready";
    appendLog("[app] FFmpeg backend ready.");
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
  externalBusy: previewJobsBusy,
  outputSizeMode: previewOutputSizeMode,
  width,
  height,
  orientation,
  scaleMode,
  ensureFfmpegReady: initializeFfmpeg,
  onLog: appendLog,
});

const previewSecondsMax = computed(() => {
  const duration = sourceDurationSeconds.value ?? trimPlayerDurationSeconds.value;
  if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
    return Math.max(0.5, Number(duration.toFixed(1)));
  }
  return 30;
});

const clampPreviewSecond = (value: number) =>
  Math.min(previewSecondsMax.value, Math.max(0, value));

const previewSecondModel = computed<number>({
  get: () =>
    typeof previewFrameSeconds.value === "number"
      ? clampPreviewSecond(previewFrameSeconds.value)
      : 0,
  set: (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      previewFrameSeconds.value = 0;
      return;
    }
    previewFrameSeconds.value = clampPreviewSecond(parsed);
  },
});

const activePreviewPanelTitle = computed(() => {
  return isVideoOutput.value ? "Output frame" : "Preview";
});

const activePreviewPanelStatus = computed(() => {
  return formatDurationClock(previewSecondModel.value, {
    includeTenths: true,
  });
});

const activePreviewPanelHelper = computed(() => {
  if (!isVideoOutput.value) {
    return "Video output required for frame preview.";
  }
  return "Matches the trim playhead.";
});

const activePreviewPanelError = computed(() => previewFrameError.value);

const showFramePreviewAction = computed(() => hasPreviewSource.value);

const showMotionPreviewAction = computed(() => hasPreviewSource.value);

const motionPreviewActionLabel = computed(() =>
  isElectronApp.value ? "Open motion preview" : "Generate motion preview"
);

const motionPreviewDialogStatus = computed(() => {
  if (
    previewMotionStartSeconds.value === null ||
    previewMotionDurationSeconds.value === null
  ) {
    return previewMotionBusy.value ? "Generating..." : "Not generated";
  }
  return `${formatDurationClock(previewMotionStartSeconds.value, {
    includeTenths: true,
  })} for ${formatDurationClock(previewMotionDurationSeconds.value, {
    includeTenths: true,
  })}`;
});

const initializePreviewAtMidpoint = () => {
  if (!initializePreviewAtMidpointPending.value || !hasPreviewSource.value) {
    return false;
  }
  const duration = sourceDurationSeconds.value ?? trimPlayerDurationSeconds.value;
  const hasDuration =
    typeof duration === "number" && Number.isFinite(duration) && duration > 0;
  if (hasDuration) {
    previewSecondModel.value = clampPreviewSecond(duration / 2);
  } else {
    previewSecondModel.value = 0;
  }
  initializePreviewAtMidpointPending.value = false;
  schedulePreviewFrameRefresh(50);
  return true;
};

const hasPreviewSource = computed(
  () => Boolean(sourceFile.value) && isVideoSource.value && isVideoOutput.value
);

const onTrimPlayerDurationDetected = (durationSeconds: number | null) => {
  if (
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    trimPlayerDurationSeconds.value = null;
    return;
  }
  trimPlayerDurationSeconds.value = durationSeconds;
};

const onTrimPlayerCurrentTimeUpdate = (seconds: number) => {
  trimPlayerCurrentSeconds.value = Math.max(0, seconds);
};

const syncOutputPreviewToTime = (seconds: number) => {
  if (!hasPreviewSource.value) {
    return;
  }
  previewSecondModel.value = seconds;
  schedulePreviewFrameRefresh(50);
};

const canRefreshFramePreviewFromPanel = computed(
  () => hasPreviewSource.value && !processing.value && !previewFrameBusy.value && !previewJobsBusy.value
);

const requestFramePreviewFromPanel = () => {
  if (!canRefreshFramePreviewFromPanel.value) {
    return;
  }
  syncOutputPreviewToTime(trimPlayerCurrentSeconds.value);
};

let sourcePreviewProxyGenerationId = 0;

const revokeSourcePreviewProxyUrl = () => {
  if (!sourcePreviewProxyUrl.value) {
    return;
  }
  URL.revokeObjectURL(sourcePreviewProxyUrl.value);
  sourcePreviewProxyUrl.value = null;
};

const clearSourcePreviewProxy = () => {
  revokeSourcePreviewProxyUrl();
  sourcePreviewProxyError.value = null;
};

const invalidateSourcePreviewProxy = () => {
  sourcePreviewProxyGenerationId += 1;
  clearSourcePreviewProxy();
};

const generateSourcePreviewProxy = async () => {
  const file = sourceFile.value;
  if (!file || !isVideoSource.value) {
    sourcePreviewProxyError.value = "Select a video file to generate a playable preview.";
    return;
  }
  if (processing.value || previewFrameBusy.value || previewJobsBusy.value) {
    return;
  }

  const ready = await initializeFfmpeg();
  if (!ready) {
    return;
  }

  const requestId = ++sourcePreviewProxyGenerationId;
  sourcePreviewProxyBusy.value = true;
  sourcePreviewProxyError.value = null;

  try {
    const result = await mediaProcessingService.renderBrowserPlayableVideoProxy(
      file,
      {
        fps: 12,
        maxWidth: 640,
        maxHeight: 360,
      },
      appendLog
    );
    if (requestId !== sourcePreviewProxyGenerationId) {
      return;
    }

    const proxyBlob = new Blob([result.data], { type: "video/webm" });
    const nextProxyUrl = URL.createObjectURL(proxyBlob);
    revokeSourcePreviewProxyUrl();
    sourcePreviewProxyUrl.value = nextProxyUrl;
  } catch (error) {
    if (requestId !== sourcePreviewProxyGenerationId) {
      return;
    }
    sourcePreviewProxyError.value =
      error instanceof Error
        ? error.message
        : "Failed to generate a playable preview video.";
  } finally {
    sourcePreviewProxyBusy.value = false;
  }
};

const previewMotionMaxDurationSeconds = 3;
const previewMotionMinDurationSeconds = 0.5;
let previewMotionGenerationId = 0;

const revokePreviewMotionUrl = () => {
  if (!previewMotionUrl.value) {
    return;
  }
  URL.revokeObjectURL(previewMotionUrl.value);
  previewMotionUrl.value = null;
};

const clearPreviewMotion = () => {
  revokePreviewMotionUrl();
  previewMotionError.value = null;
  previewMotionStartSeconds.value = null;
  previewMotionDurationSeconds.value = null;
  motionPreviewDialogOpen.value = false;
};

const invalidatePreviewMotion = () => {
  previewMotionGenerationId += 1;
  clearPreviewMotion();
};

const resolveMotionPreviewWindow = (requestedSeconds: number) => {
  const [trimStart, trimEnd] = trimRangeModel.value;
  const selectionStart = Math.max(0, trimStart);
  const selectionEnd = Math.max(selectionStart, Math.min(previewSecondsMax.value, trimEnd));
  const selectionDuration = selectionEnd - selectionStart;
  if (selectionDuration < previewMotionMinDurationSeconds) {
    return null;
  }

  const preferredDuration = Math.min(previewMotionMaxDurationSeconds, selectionDuration);
  const maxStart = Math.max(selectionStart, selectionEnd - preferredDuration);
  const normalizedRequest = Number.isFinite(requestedSeconds) ? requestedSeconds : selectionStart;
  const startSeconds = Math.min(maxStart, Math.max(selectionStart, normalizedRequest));
  const durationSeconds = Math.min(previewMotionMaxDurationSeconds, selectionEnd - startSeconds);
  if (durationSeconds < previewMotionMinDurationSeconds) {
    return null;
  }

  return {
    startSeconds,
    durationSeconds,
  };
};

const buildMotionPreviewOptions = (
  startSeconds: number,
  durationSeconds: number
): VideoTranscodeOptions => {
  const options: VideoTranscodeOptions = {
    orientation: orientation.value,
    startSeconds,
    durationSeconds,
  };
  const cropRegion = activeCustomCropRegion.value;
  if (cropRegion) {
    options.cropRegion = cropRegion;
  }
  if (outputSizeMode.value === "custom" && width.value && height.value) {
    options.width = Math.max(1, Math.round(width.value));
    options.height = Math.max(1, Math.round(height.value));
    options.scaleMode = scaleMode.value;
  }
  const targetFps =
    typeof fps.value === "number" && Number.isFinite(fps.value) && fps.value > 0
      ? Math.round(fps.value)
      : 12;
  options.fps = Math.max(1, Math.min(15, targetFps));
  return options;
};

const openMotionPreviewInFfplay = async (file: File, options: VideoTranscodeOptions) => {
  const electronMedia = getElectronMediaApi();
  if (!electronMedia) {
    throw new Error("Electron media bridge is not available.");
  }
  await electronMedia.playMotionPreview({
    file: await serializeElectronInputFile(file),
    options: {
      width: options.width,
      height: options.height,
      orientation: options.orientation,
      scaleMode: options.scaleMode,
      cropRegion: options.cropRegion,
      fps: options.fps,
      startSeconds: options.startSeconds,
      durationSeconds: options.durationSeconds,
    },
  });
};

const generateMotionPreviewFromPlayer = async (seconds: number) => {
  const file = sourceFile.value;
  if (!file || !isVideoSource.value || !isVideoOutput.value) {
    previewMotionError.value = "Select a video file to generate a motion preview.";
    return false;
  }
  if (processing.value || previewFrameBusy.value || previewJobsBusy.value) {
    return false;
  }

  const previewWindow = resolveMotionPreviewWindow(seconds);
  if (!previewWindow) {
    previewMotionError.value = "Select at least 0.5 seconds in the trim range to preview motion.";
    return false;
  }

  const ready = await initializeFfmpeg();
  if (!ready) {
    return false;
  }

  const requestId = ++previewMotionGenerationId;
  previewMotionBusy.value = true;
  previewMotionError.value = null;

  try {
    const motionPreviewOptions = buildMotionPreviewOptions(
      previewWindow.startSeconds,
      previewWindow.durationSeconds
    );
    if (isElectronApp.value) {
      clearPreviewMotion();
      await openMotionPreviewInFfplay(file, motionPreviewOptions);
      appendLog("[app] Opened motion preview in ffplay.");
      return true;
    }
    const result = await mediaProcessingService.renderVideoMotionPreview(
      file,
      motionPreviewOptions,
      appendLog
    );
    if (requestId !== previewMotionGenerationId) {
      return;
    }

    const previewBlob = new Blob([result.data], { type: "image/gif" });
    const nextPreviewUrl = URL.createObjectURL(previewBlob);
    revokePreviewMotionUrl();
    previewMotionUrl.value = nextPreviewUrl;
    previewMotionStartSeconds.value = previewWindow.startSeconds;
    previewMotionDurationSeconds.value = previewWindow.durationSeconds;
    return true;
  } catch (error) {
    if (requestId !== previewMotionGenerationId) {
      return false;
    }
    previewMotionError.value =
      error instanceof Error ? error.message : "Failed to generate motion preview.";
    return false;
  } finally {
    previewMotionBusy.value = false;
  }
};

const canGenerateMotionPreviewFromPanel = computed(
  () => hasPreviewSource.value && !processing.value && !previewFrameBusy.value && !previewJobsBusy.value
);

const requestMotionPreviewFromPanel = () => {
  if (!canGenerateMotionPreviewFromPanel.value) {
    return;
  }
  if (isElectronApp.value) {
    motionPreviewDialogOpen.value = false;
    void generateMotionPreviewFromPlayer(trimPlayerCurrentSeconds.value);
    return;
  }
  motionPreviewDialogOpen.value = true;
  void generateMotionPreviewFromPlayer(trimPlayerCurrentSeconds.value);
};

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

const refreshElectronRuntimeState = () => {
  isElectronApp.value = isElectronRuntime();
};

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
  const cropRegion = activeCustomCropRegion.value;
  if (cropRegion) {
    options.cropRegion = cropRegion;
  }
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
  if (typeof startSeconds.value === "number") {
    options.startSeconds = Math.max(0, startSeconds.value);
  }
  if (typeof endSeconds.value === "number") {
    options.endSeconds = Math.max(0, endSeconds.value);
  }
  return options;
};

const runConversion = async () => {
  const file = sourceFile.value;
  if (!file) {
    processingError.value = "Select a source media file.";
    return;
  }
  if (previewJobsBusy.value) {
    processingError.value = "Wait for preview generation to finish.";
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

  const requestedOutputFileName = ensureOutputFileName(
    outputFileName.value,
    file.name,
    outputFormat.value
  );
  let electronOutputPath: string | null = null;
  if (isElectronApp.value) {
    electronOutputPath = await resolveElectronOutputSavePath(
      requestedOutputFileName,
      outputFormat.value
    );
    if (!electronOutputPath) {
      return;
    }
    outputFileName.value = fileNameFromPath(electronOutputPath);
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
  let lastProgressLogAtMs = 0;

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
    const isHighFrequencyProgress = isHighFrequencyFfmpegProgressLine(message);
    if (isHighFrequencyProgress) {
      const now = Date.now();
      if (now - lastProgressLogAtMs < ffmpegProgressLogThrottleMs) {
        markProcessingActivity();
        return;
      }
      lastProgressLogAtMs = now;
    }
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
    let result: MediaProcessingResult;

    if (outputFormat.value === "gif") {
      const options = buildVideoOptions();
      if (electronOutputPath) {
        options.outputPath = electronOutputPath;
      }
      result = await mediaProcessingService.transcodeVideoToGif(
        file,
        options,
        onProgress,
        onLog,
        signal
      );
    } else if (outputFormat.value === "mjpeg") {
      const options = buildVideoOptions();
      if (electronOutputPath) {
        options.outputPath = electronOutputPath;
      }
      result = await mediaProcessingService.transcodeVideoToMjpeg(
        file,
        options,
        onProgress,
        onLog,
        signal
      );
    } else if (outputFormat.value === "avi") {
      const options = buildVideoOptions();
      if (electronOutputPath) {
        options.outputPath = electronOutputPath;
      }
      result = await mediaProcessingService.transcodeVideoToAvi(
        file,
        options,
        onProgress,
        onLog,
        signal
      );
    } else {
      const options = buildAudioOptions();
      if (electronOutputPath) {
        options.outputPath = electronOutputPath;
      }
      result = await mediaProcessingService.extractAudioFromVideo(
        file,
        options,
        onProgress,
        onLog,
        signal
      );
    }

    processingPhase.value = "packaging";
    const finalName = result.savedPath
      ? fileNameFromPath(result.savedPath)
      : ensureOutputFileName(outputFileName.value, file.name, outputFormat.value);
    outputFileName.value = finalName;
    if (result.savedPath) {
      outputSavedPath.value = result.savedPath;
      appendLog(`[app] Output saved: ${result.savedPath}`);
    } else {
      const outputBlob = new Blob([result.data], { type: outputMimeMap[outputFormat.value] });
      outputFileUrl.value = URL.createObjectURL(outputBlob);
      appendLog(
        `[app] Output ready: ${finalName} (${(outputBlob.size / (1024 * 1024)).toFixed(2)} MB)`
      );
    }
    processingPhase.value = "complete";
    processingProgress.value = 100;
    downloadReadyDialogOpen.value = true;
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
  if (outputSavedPath.value) {
    void getElectronMediaApi()?.revealPath(outputSavedPath.value);
    downloadReadyDialogOpen.value = false;
    return;
  }
  if (!outputFileUrl.value) {
    return;
  }
  const link = document.createElement("a");
  link.href = outputFileUrl.value;
  link.download = outputFileName.value || `output.${outputExtensionMap[outputFormat.value]}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  downloadReadyDialogOpen.value = false;
};

const canDownloadPreviewImage = computed(
  () => Boolean(previewFrameUrl.value) && hasPreviewSource.value && !previewFrameBusy.value
);

const showPreviewDownloadAction = computed(
  () => canDownloadPreviewImage.value
);

const shouldDownloadCroppedPreviewImage = computed(
  () =>
    customCropPreviewApplied.value &&
    customCropEnabled.value &&
    supportsCustomCrop.value &&
    Boolean(customCropRect.value)
);

const loadImageFromUrl = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load preview image for cropping."));
    image.src = url;
  });

const createCroppedPreviewImageBlob = async (): Promise<Blob | null> => {
  if (
    !previewFrameUrl.value ||
    !customCropRect.value ||
    typeof document === "undefined"
  ) {
    return null;
  }
  const image = await loadImageFromUrl(previewFrameUrl.value);
  const normalized = normalizeCropRect(customCropRect.value);
  const sourceWidth = Math.max(1, Math.round(image.naturalWidth));
  const sourceHeight = Math.max(1, Math.round(image.naturalHeight));
  const cropX = Math.max(0, Math.min(sourceWidth - 1, Math.round(normalized.x * sourceWidth)));
  const cropY = Math.max(0, Math.min(sourceHeight - 1, Math.round(normalized.y * sourceHeight)));
  const cropWidth = Math.max(
    1,
    Math.min(sourceWidth - cropX, Math.round(normalized.width * sourceWidth))
  );
  const cropHeight = Math.max(
    1,
    Math.min(sourceHeight - cropY, Math.round(normalized.height * sourceHeight))
  );

  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
};

const downloadBlobAsFile = (blob: Blob, fileName: string) => {
  if (typeof document === "undefined") {
    return;
  }
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
};

const downloadPreviewImage = async () => {
  if (!previewFrameUrl.value || typeof document === "undefined") {
    return;
  }

  if (shouldDownloadCroppedPreviewImage.value) {
    try {
      const croppedBlob = await createCroppedPreviewImageBlob();
      if (croppedBlob) {
        downloadBlobAsFile(croppedBlob, createPreviewFileName());
        return;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export cropped preview image.";
      appendLog(`[warn] ${message}`);
    }
  }

  const link = document.createElement("a");
  link.href = previewFrameUrl.value;
  link.download = createPreviewFileName();
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

watch(outputFormat, () => {
  persistConversionPreferences();
});

watch(
  [orientation, scaleMode, fps, quality],
  () => {
    if (suppressDisplaySettingsPersistence) {
      return;
    }
    const key = currentDisplaySettingsKey.value;
    if (!key) {
      return;
    }
    persistDisplayConversionSettings(key, {
      orientation: orientation.value,
      scaleMode: scaleMode.value,
      fps: fps.value,
      quality: quality.value,
    });
  },
  { flush: "sync" }
);

watch(
  () => [
    sourceFile.value?.name ?? "",
    sourceFile.value?.size ?? 0,
    sourceFile.value?.lastModified ?? 0,
    isVideoSource.value,
    isVideoOutput.value,
    outputFormat.value,
    outputSizeMode.value,
    width.value ?? 0,
    height.value ?? 0,
    orientation.value,
    scaleMode.value,
    fps.value ?? 0,
    customCropEnabled.value,
    customCropRect.value?.x ?? 0,
    customCropRect.value?.y ?? 0,
    customCropRect.value?.width ?? 0,
    customCropRect.value?.height ?? 0,
    startSeconds.value ?? 0,
    endSeconds.value ?? 0,
  ],
  () => {
    invalidatePreviewMotion();
  }
);

watch(customCropEnabled, (enabled) => {
  if (!enabled) {
    customCropRect.value = null;
    schedulePreviewFrameRefresh(50);
    return;
  }
  if (!supportsCustomCrop.value) {
    customCropEnabled.value = false;
    customCropRect.value = null;
    return;
  }
  resetCustomCropRect();
  schedulePreviewFrameRefresh(50);
});

watch(supportsCustomCrop, (supported) => {
  if (!supported) {
    if (customCropEnabled.value) {
      customCropEnabled.value = false;
    }
    customCropRect.value = null;
    schedulePreviewFrameRefresh(50);
    return;
  }
  if (customCropEnabled.value && !customCropRect.value) {
    resetCustomCropRect();
    schedulePreviewFrameRefresh(50);
  }
});

watch(
  [
    () => orientedSourceDimensions.value?.width ?? 0,
    () => orientedSourceDimensions.value?.height ?? 0,
    () => customCropTargetAspectRatio.value ?? 0,
    orientation,
  ],
  () => {
    if (!customCropEnabled.value || !supportsCustomCrop.value) {
      return;
    }
    resetCustomCropRect();
  }
);

watch(previewSecondsMax, () => {
  if (typeof previewFrameSeconds.value !== "number") {
    return;
  }
  const clamped = clampPreviewSecond(previewFrameSeconds.value);
  if (Math.abs(clamped - previewFrameSeconds.value) < 0.001) {
    return;
  }
  previewFrameSeconds.value = clamped;
});

watch(
  [sourceDurationSeconds, trimPlayerDurationSeconds, sourceMetadataLoading, hasPreviewSource],
  ([sourceDuration, playerDuration, metadataLoading, hasSource]) => {
    const hasKnownDuration =
      (typeof sourceDuration === "number" && Number.isFinite(sourceDuration) && sourceDuration > 0) ||
      (typeof playerDuration === "number" && Number.isFinite(playerDuration) && playerDuration > 0);
    if (
      !initializePreviewAtMidpointPending.value ||
      !hasSource ||
      (metadataLoading && !hasKnownDuration)
    ) {
      return;
    }
    void initializePreviewAtMidpoint();
  }
);

watch(sourceFile, (file) => {
  clearPreviewDebounce();
  clearOutput();
  clearPreviewFrame();
  invalidatePreviewMotion();
  invalidateSourcePreviewProxy();
  trimPlayerCurrentSeconds.value = 0;
  initializePreviewAtMidpointPending.value = false;
  customCropEnabled.value = false;
  customCropRect.value = null;
  processingError.value = null;
  processingProgress.value = 0;
  trimPlayerDurationSeconds.value = null;
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
    previewFrameSeconds.value = null;
    initializePreviewAtMidpointPending.value = true;
    if (!sourceMetadataLoading.value) {
      void initializePreviewAtMidpoint();
    }
  }
});

watch(outputFormat, (format) => {
  clearOutput();
  if (!sourceFile.value) {
    outputFileName.value = "";
    return;
  }
  const currentBaseName = extractOutputBaseName(outputFileName.value);
  const fallbackBaseName = fileBaseName(sourceFile.value.name);
  outputFileName.value = buildOutputFileName(currentBaseName || fallbackBaseName, format);
});

watch(isVideoOutput, (isVideo) => {
  if (!isVideo) {
    trimPlayerCurrentSeconds.value = 0;
    initializePreviewAtMidpointPending.value = false;
    return;
  }
  if (!sourceFile.value || !isVideoSource.value || typeof previewFrameSeconds.value === "number") {
    return;
  }
  initializePreviewAtMidpointPending.value = true;
  if (!sourceMetadataLoading.value) {
    void initializePreviewAtMidpoint();
  }
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
  applySelectedCustomDisplaySettings();
  persistBoardSelection();
});

watch([customBoardWidth, customBoardHeight], () => {
  if (!canUseCustomBoardRoundDisplay.value && customBoardRoundDisplay.value) {
    customBoardRoundDisplay.value = false;
  }
  persistCustomBoardDraft();
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

watch(customBoardRoundDisplay, (isRoundDisplay) => {
  if (isRoundDisplay && !canUseCustomBoardRoundDisplay.value) {
    customBoardRoundDisplay.value = false;
    return;
  }
  persistCustomBoardDraft();
});

watch(hasBoardSelection, (isReady) => {
  if (!isReady && activeNavigation.value === "workspace") {
    activeNavigation.value = "boards";
  }
});

onMounted(() => {
  refreshElectronRuntimeState();
  const persistedCustomBoardDraft = loadPersistedCustomBoardDraft();
  if (persistedCustomBoardDraft) {
    customBoardWidth.value = persistedCustomBoardDraft.width;
    customBoardHeight.value = persistedCustomBoardDraft.height;
    customBoardRoundDisplay.value = persistedCustomBoardDraft.roundDisplay;
  }

  const persistedBoardSelection = loadPersistedBoardSelection();
  if (persistedBoardSelection?.mode === "preset" && persistedBoardSelection.presetId) {
    targetSetupMode.value = "preset";
    selectedBoardPresetId.value = persistedBoardSelection.presetId;
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
  }
  applySizingDefaults();
  const persistedPreferences = loadPersistedConversionPreferences();
  if (persistedPreferences) {
    outputFormat.value = persistedPreferences.outputFormat;
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
  clearPreviewMotion();
  clearSourcePreviewProxy();
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

.app-main-container {
  max-width: none !important;
  padding-left: 8px !important;
  padding-right: 18px !important;
}

.app-main-row {
  margin: 0 !important;
}

.app-main-column {
  padding: 0 !important;
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

.app-bar-display {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.app-bar-display__label {
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.app-bar-display__chip {
  min-width: 0;
  max-width: min(420px, 38vw);
  border-radius: 0 !important;
}

.app-bar-display__chip :deep(.v-chip__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-bar-display__action {
  white-space: nowrap;
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

.workspace-section {
  border: none;
  border-radius: 0;
  background: rgba(var(--v-theme-surface), 0.42);
  box-shadow: none;
  padding: 14px;
}

.workspace-body-grid {
  align-items: start;
}

.workspace-preview-panel {
  display: flex;
  flex-direction: column;
  background: rgba(var(--v-theme-surface), 0.38);
  border-color: rgba(var(--v-theme-on-surface), 0.1) !important;
  border-radius: 0 !important;
}

.workspace-preview-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.workspace-preview-panel__header-copy {
  display: grid;
  gap: 4px;
}

.workspace-preview-panel__title {
  font-size: 1.35rem;
  line-height: 1.15;
  font-weight: 800;
  color: rgb(var(--v-theme-on-surface));
}

.workspace-preview-panel__helper {
  max-width: 460px;
  line-height: 1.35;
}

.workspace-preview-settings {
  padding: 12px 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgba(var(--v-theme-surface), 0.3);
}

.workspace-preview-settings__intro {
  max-width: none;
  line-height: 1.35;
}

.workspace-preview-settings__grid {
  row-gap: 2px;
}

.workspace-preview-settings__crop {
  min-height: 100%;
  display: grid;
  gap: 4px;
  padding: 6px 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-surface), 0.28);
}

.workspace-preview-settings__crop-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.workspace-preview-settings__crop-row :deep(.v-input) {
  flex: 0 1 auto;
}

.workspace-preview-settings__crop-copy {
  line-height: 1.25;
}

.output-ready-action-btn {
  min-width: 132px;
}

.output-ready-action-btn :deep(.v-btn__content) {
  color: rgb(var(--v-theme-on-success));
  font-weight: 700;
}

.output-file-name-extension {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.95rem;
  white-space: nowrap;
}

.workspace-preview-panel__surface {
  flex: 1 1 auto;
}

.workspace-preview-panel__preview {
  display: grid;
  gap: 12px;
}

.workspace-preview-panel__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-surface), 0.18);
}

.workspace-preview-panel__meta {
  display: grid;
  gap: 4px;
  flex: 1 1 280px;
  min-width: 0;
}

.workspace-preview-panel__meta-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.workspace-preview-panel__meta-status {
  font-weight: 600;
}

.workspace-preview-panel__toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.motion-preview-dialog {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgba(var(--v-theme-surface), 0.96);
}

.motion-preview-dialog__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 0;
}

.motion-preview-dialog__body {
  padding-top: 12px !important;
}

.motion-preview-dialog__helper {
  max-width: 520px;
}

.motion-preview-dialog__context {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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

.workspace-section-label {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.72);
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
  .app-main-container {
    padding-left: 6px !important;
    padding-right: 12px !important;
  }

  .app-bar-display__label {
    display: none;
  }

  .app-bar-display__chip {
    max-width: min(220px, 48vw);
  }

  .app-bar-display__action {
    min-width: auto;
    padding-inline: 10px !important;
  }

  .workspace-preview-panel__toolbar {
    justify-content: flex-start;
  }

  .workspace-preview-panel__helper {
    max-width: none;
    text-align: left;
  }

  .workspace-preview-panel__footer {
    align-items: flex-start;
    justify-content: flex-start;
  }

  .workspace-preview-panel__header {
    flex-direction: column;
  }

  .app-nav-target {
    scroll-margin-top: 84px;
  }
}
</style>
