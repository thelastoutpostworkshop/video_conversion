<template>
  <v-app>
    <v-main>
      <v-container class="py-6">
        <v-row justify="center">
          <v-col cols="12" xl="10">
            <v-card rounded="lg" elevation="4" class="panel-card">
              <v-card-title class="d-flex align-center flex-wrap ga-3">
                <div>
                  <div class="text-h6">Video Conversion Studio</div>
                  <div class="text-caption text-medium-emphasis">
                    Vue 3 + TypeScript + Vuetify + ffmpeg.wasm
                  </div>
                </div>
                <v-chip :color="ffmpegStatusColor" variant="tonal" size="small">
                  {{ ffmpegStatusText }}
                </v-chip>
                <v-spacer />
              </v-card-title>

              <v-divider />

              <v-card-text>
                <v-row dense>
                  <v-col cols="12" md="8">
                    <v-file-input
                      :model-value="sourceFile"
                      label="Source media"
                      prepend-icon="mdi-file-video"
                      accept="video/*,audio/*,.mjpeg,.mjpg,.avi,.mov,.mkv,.mp4,.webm"
                      density="comfortable"
                      :disabled="processing || previewFrameBusy"
                      @update:model-value="onSourceFileUpdate"
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
                    <div class="preview-surface">
                      <img
                        v-if="previewFrameUrl && isVideoOutput"
                        :src="previewFrameUrl"
                        alt="Generated preview frame"
                        class="preview-frame-image"
                      />
                      <div v-else-if="previewFrameBusy && isVideoOutput" class="preview-placeholder">
                        Generating frame preview...
                      </div>
                      <div v-else-if="!sourceFile" class="preview-placeholder">
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
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-card variant="tonal">
                      <v-card-title class="text-subtitle-2">Source metadata</v-card-title>
                      <v-card-text>
                        <div class="text-body-2">
                          {{ sourceMetadataLabel }}
                        </div>
                        <v-progress-linear
                          v-if="sourceMetadataLoading"
                          indeterminate
                          height="4"
                          class="mt-3"
                        />
                        <v-alert
                          v-else-if="sourceMetadataError"
                          type="warning"
                          variant="tonal"
                          class="mt-3"
                        >
                          {{ sourceMetadataError }}
                        </v-alert>
                        <div class="text-caption text-medium-emphasis mt-3">
                          Metadata is read automatically for video sources.
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>

                <v-divider class="my-4" />

                <v-row v-if="isVideoOutput" dense>
                  <v-col cols="12" md="4">
                    <v-select
                      v-model="targetSetupMode"
                      :items="targetSetupModeItems"
                      item-title="title"
                      item-value="value"
                      label="Target setup"
                      density="comfortable"
                      :disabled="processing"
                    />
                  </v-col>
                  <v-col cols="12" md="8">
                    <v-select
                      v-if="targetSetupMode === 'preset'"
                      v-model="selectedBoardPresetId"
                      :items="boardPresetItems"
                      item-title="title"
                      item-value="value"
                      label="Development board"
                      density="comfortable"
                      :disabled="processing"
                    />
                    <v-select
                      v-else
                      v-model="selectedCustomProfileId"
                      :items="customProfileItems"
                      item-title="title"
                      item-value="value"
                      label="Saved custom profile"
                      clearable
                      density="comfortable"
                      :disabled="processing || customProfiles.length === 0"
                    />
                  </v-col>
                  <v-col cols="12" v-if="targetSetupMode === 'preset' && selectedBoardPresetDetails">
                    <v-alert type="info" variant="tonal">
                      {{ selectedBoardPresetDetails }}
                    </v-alert>
                  </v-col>
                  <v-col cols="12" md="8" v-if="targetSetupMode === 'custom'">
                    <v-text-field
                      v-model="customProfileName"
                      label="Custom profile name"
                      density="comfortable"
                      :disabled="processing"
                    />
                  </v-col>
                  <v-col
                    cols="12"
                    md="4"
                    v-if="targetSetupMode === 'custom'"
                    class="d-flex align-center ga-2"
                  >
                    <v-btn
                      color="primary"
                      variant="tonal"
                      :disabled="!canSaveCustomProfile"
                      @click="saveCustomProfile"
                    >
                      Save profile
                    </v-btn>
                    <v-btn
                      color="error"
                      variant="text"
                      :disabled="!selectedCustomProfileId"
                      @click="deleteSelectedCustomProfile"
                    >
                      Delete
                    </v-btn>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-select
                      v-model="outputSizeMode"
                      :items="sizeModeItems"
                      item-title="title"
                      item-value="value"
                      label="Output size"
                      density="comfortable"
                      :disabled="processing"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
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
                  <v-col cols="12" md="4">
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

                  <v-col cols="12" md="3">
                    <v-text-field
                      :model-value="width"
                      label="Width"
                      type="number"
                      density="comfortable"
                      :disabled="processing || outputSizeMode !== 'custom'"
                      @update:model-value="(value) => (width = toNullableNumber(value))"
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-text-field
                      :model-value="height"
                      label="Height"
                      type="number"
                      density="comfortable"
                      :disabled="processing || outputSizeMode !== 'custom'"
                      @update:model-value="(value) => (height = toNullableNumber(value))"
                    />
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-text-field
                      :model-value="fps"
                      label="FPS"
                      type="number"
                      density="comfortable"
                      :disabled="processing"
                      @update:model-value="(value) => (fps = toNullableNumber(value))"
                    />
                  </v-col>
                  <v-col cols="12" md="2">
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
                  <v-col cols="12" md="2">
                    <v-text-field
                      :model-value="previewFrameSeconds"
                      label="Preview second"
                      type="number"
                      density="comfortable"
                      :disabled="processing || previewFrameBusy"
                      @update:model-value="
                        (value) => (previewFrameSeconds = toNonNegativeNullable(value))
                      "
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field
                      :model-value="startSeconds"
                      label="Start seconds"
                      type="number"
                      density="comfortable"
                      :disabled="processing"
                      @update:model-value="
                        (value) => (startSeconds = toNonNegativeNullable(value))
                      "
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      :model-value="endSeconds"
                      label="End seconds"
                      type="number"
                      density="comfortable"
                      :disabled="processing"
                      @update:model-value="
                        (value) => (endSeconds = toNonNegativeNullable(value))
                      "
                    />
                  </v-col>
                </v-row>

                <v-row v-else dense>
                  <v-col cols="12" md="4">
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
                  v-if="hasRangeError"
                  type="warning"
                  variant="tonal"
                  class="mt-2"
                >
                  End seconds must be greater than start seconds.
                </v-alert>

                <v-divider class="my-4" />

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

                <v-divider class="my-4" />

                <div class="d-flex align-center">
                  <div class="text-subtitle-2">FFmpeg logs</div>
                  <v-spacer />
                  <v-btn
                    size="small"
                    variant="text"
                    :disabled="logLines.length === 0"
                    @click="clearLogs"
                  >
                    Clear
                  </v-btn>
                </div>
                <v-textarea
                  :model-value="logsText"
                  readonly
                  auto-grow
                  rows="8"
                  variant="outlined"
                  class="log-output mt-2"
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type {
  AudioTranscodeOptions,
  MediaLogCallback,
  MediaProgressCallback,
  VideoMetadataResult,
  VideoOrientation,
  VideoScaleMode,
  VideoTranscodeOptions,
} from "@/services/MediaProcessingService";
import { mediaProcessingService } from "@/services/mediaProcessingServiceInstance";
import {
  BOARD_PRESETS,
  type TargetProfileBase,
  type VideoOutputFormat,
} from "@/config/boardPresets";

type OutputFormat = VideoOutputFormat | "mp3";
type OutputSizeMode = "original" | "custom";
type FfmpegStatus = "idle" | "loading" | "ready" | "error";
type TargetSetupMode = "preset" | "custom";

interface CustomTargetProfile extends TargetProfileBase {
  id: string;
  name: string;
  createdAt: string;
}

const formatItems: Array<{ title: string; value: OutputFormat }> = [
  { title: "GIF", value: "gif" },
  { title: "MJPEG", value: "mjpeg" },
  { title: "AVI", value: "avi" },
  { title: "MP3 (audio extract)", value: "mp3" },
];

const sizeModeItems: Array<{ title: string; value: OutputSizeMode }> = [
  { title: "Original", value: "original" },
  { title: "Custom", value: "custom" },
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
  { title: "Custom target profile", value: "custom" },
];

const customTargetStorageKey = "video-conversion.custom-target-profiles.v1";

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

const sourceFile = ref<File | null>(null);
const outputFileUrl = ref<string | null>(null);
const previewFrameUrl = ref<string | null>(null);

const outputFormat = ref<OutputFormat>("gif");
const outputFileName = ref("");
const outputSizeMode = ref<OutputSizeMode>("original");
const width = ref<number | null>(320);
const height = ref<number | null>(240);
const scaleMode = ref<VideoScaleMode>("fit");
const orientation = ref<VideoOrientation>("none");
const fps = ref<number | null>(20);
const quality = ref<number | null>(5);
const startSeconds = ref<number | null>(null);
const endSeconds = ref<number | null>(null);
const previewFrameSeconds = ref<number | null>(0);
const mp3Bitrate = ref<number | null>(128);
const targetSetupMode = ref<TargetSetupMode>("preset");
const selectedBoardPresetId = ref<string>(BOARD_PRESETS[0]?.id ?? "");
const customProfiles = ref<CustomTargetProfile[]>([]);
const selectedCustomProfileId = ref<string | null>(null);
const customProfileName = ref("");

const sourceMetadata = ref<VideoMetadataResult | null>(null);
const sourceMetadataLoading = ref(false);
const sourceMetadataError = ref<string | null>(null);

const ffmpegStatus = ref<FfmpegStatus>("idle");
const processing = ref(false);
const processingProgress = ref(0);
const processingError = ref<string | null>(null);
const previewFrameBusy = ref(false);
const previewFrameError = ref<string | null>(null);
const logLines = ref<string[]>([]);

let convertAbortController: AbortController | null = null;
let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let previewRefreshQueued = false;

const isVideoOutput = computed(() => outputFormat.value !== "mp3");

const boardPresetItems = computed(() =>
  BOARD_PRESETS.map((preset) => ({
    title: `${preset.name} (${preset.width}x${preset.height})`,
    value: preset.id,
  }))
);

const customProfileItems = computed(() =>
  customProfiles.value.map((profile) => ({
    title: `${profile.name} (${profile.width}x${profile.height})`,
    value: profile.id,
  }))
);

const selectedBoardPreset = computed(() =>
  BOARD_PRESETS.find((preset) => preset.id === selectedBoardPresetId.value) ?? null
);

const selectedCustomProfile = computed(() =>
  customProfiles.value.find((profile) => profile.id === selectedCustomProfileId.value) ?? null
);

const isVideoSource = computed(() => {
  if (!sourceFile.value) {
    return false;
  }
  if (sourceFile.value.type.startsWith("video/")) {
    return true;
  }
  const lowerName = sourceFile.value.name.toLowerCase();
  return (
    lowerName.endsWith(".avi") ||
    lowerName.endsWith(".mjpeg") ||
    lowerName.endsWith(".mjpg") ||
    lowerName.endsWith(".mov") ||
    lowerName.endsWith(".mkv") ||
    lowerName.endsWith(".mp4") ||
    lowerName.endsWith(".webm")
  );
});

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

const hasRangeError = computed(() => {
  if (
    typeof startSeconds.value === "number" &&
    typeof endSeconds.value === "number"
  ) {
    return endSeconds.value <= startSeconds.value;
  }
  return false;
});

const canConvert = computed(() => {
  if (!sourceFile.value || processing.value || previewFrameBusy.value) {
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

const canSaveCustomProfile = computed(() => {
  if (processing.value || targetSetupMode.value !== "custom") {
    return false;
  }
  const hasName = customProfileName.value.trim().length > 0;
  const hasSize =
    typeof width.value === "number" &&
    width.value > 0 &&
    typeof height.value === "number" &&
    height.value > 0;
  return hasName && hasSize;
});

const selectedBoardPresetDetails = computed(() => {
  const preset = selectedBoardPreset.value;
  if (!preset) {
    return "";
  }
  return `${preset.bundle}. ${preset.notes}`;
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

const logsText = computed(() => logLines.value.join("\n"));

const toNullableNumber = (value: string | number | null): number | null => {
  if (value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNonNegativeNullable = (value: string | number | null): number | null => {
  const parsed = toNullableNumber(value);
  if (parsed === null) {
    return null;
  }
  return parsed < 0 ? 0 : parsed;
};

const toPositiveNullable = (value: string | number | null): number | null => {
  const parsed = toNullableNumber(value);
  if (parsed === null) {
    return null;
  }
  return parsed <= 0 ? 1 : parsed;
};

const toPositiveInteger = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed);
};

const toPositiveIntegerOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return toPositiveInteger(value);
};

const isVideoOrientation = (value: unknown): value is VideoOrientation =>
  value === "none" || value === "cw90" || value === "ccw90" || value === "flip180";

const isVideoScaleMode = (value: unknown): value is VideoScaleMode =>
  value === "fit" || value === "fill" || value === "stretch";

const isVideoOutputFormat = (value: unknown): value is VideoOutputFormat =>
  value === "gif" || value === "mjpeg" || value === "avi";

const createProfileId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeVideoOutputFormat = (format: OutputFormat): VideoOutputFormat =>
  format === "mp3" ? "mjpeg" : format;

const parseCustomTargetProfile = (value: unknown): CustomTargetProfile | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const widthValue = toPositiveInteger(record.width);
  const heightValue = toPositiveInteger(record.height);
  const orientationValue = record.orientation;
  const scaleModeValue = record.scaleMode;
  const outputFormatValue = record.outputFormat;
  if (
    !id ||
    !name ||
    !widthValue ||
    !heightValue ||
    !isVideoOrientation(orientationValue) ||
    !isVideoScaleMode(scaleModeValue) ||
    !isVideoOutputFormat(outputFormatValue)
  ) {
    return null;
  }

  return {
    id,
    name,
    width: widthValue,
    height: heightValue,
    orientation: orientationValue,
    scaleMode: scaleModeValue,
    fps: toPositiveIntegerOrNull(record.fps),
    quality: toPositiveIntegerOrNull(record.quality),
    outputFormat: outputFormatValue,
    createdAt:
      typeof record.createdAt === "string"
        ? record.createdAt
        : new Date().toISOString(),
  };
};

const persistCustomProfiles = () => {
  try {
    localStorage.setItem(customTargetStorageKey, JSON.stringify(customProfiles.value));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to persist target profiles.";
    appendLog(`[warn] ${message}`);
  }
};

const loadCustomProfiles = () => {
  try {
    const raw = localStorage.getItem(customTargetStorageKey);
    if (!raw) {
      customProfiles.value = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      customProfiles.value = [];
      return;
    }
    customProfiles.value = parsed
      .map((item) => parseCustomTargetProfile(item))
      .filter((item): item is CustomTargetProfile => item !== null);
  } catch (error) {
    customProfiles.value = [];
    const message =
      error instanceof Error ? error.message : "Failed to load saved target profiles.";
    appendLog(`[warn] ${message}`);
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

const applySelectedCustomProfile = (
  options: { setOutputFormat?: boolean; writeLog?: boolean } = {}
) => {
  const profile = selectedCustomProfile.value;
  if (!profile) {
    return;
  }
  applyTargetProfile(profile, options);
};

const applySizingDefaults = () => {
  if (outputSizeMode.value !== "custom") {
    return;
  }
  if (targetSetupMode.value === "preset") {
    applySelectedBoardPreset({ setOutputFormat: false, writeLog: false });
    return;
  }
  if (selectedCustomProfile.value) {
    applySelectedCustomProfile({ setOutputFormat: false, writeLog: false });
    return;
  }
  if (sourceMetadata.value) {
    width.value = sourceMetadata.value.width;
    height.value = sourceMetadata.value.height;
  }
};

const saveCustomProfile = () => {
  if (!canSaveCustomProfile.value) {
    return;
  }

  const widthValue = toPositiveInteger(width.value);
  const heightValue = toPositiveInteger(height.value);
  if (!widthValue || !heightValue) {
    return;
  }

  const profile: CustomTargetProfile = {
    id: selectedCustomProfileId.value ?? createProfileId(),
    name: customProfileName.value.trim(),
    width: widthValue,
    height: heightValue,
    orientation: orientation.value,
    scaleMode: scaleMode.value,
    fps: toPositiveIntegerOrNull(fps.value),
    quality: toPositiveIntegerOrNull(quality.value),
    outputFormat: normalizeVideoOutputFormat(outputFormat.value),
    createdAt: new Date().toISOString(),
  };

  const existingIndex = customProfiles.value.findIndex(
    (item) => item.id === profile.id
  );
  if (existingIndex >= 0) {
    const next = [...customProfiles.value];
    next[existingIndex] = profile;
    customProfiles.value = next;
    appendLog(`[app] Updated custom target profile "${profile.name}".`);
  } else {
    customProfiles.value = [...customProfiles.value, profile];
    appendLog(`[app] Saved custom target profile "${profile.name}".`);
  }
  selectedCustomProfileId.value = profile.id;
  persistCustomProfiles();
};

const deleteSelectedCustomProfile = () => {
  if (!selectedCustomProfileId.value) {
    return;
  }
  const profile = selectedCustomProfile.value;
  customProfiles.value = customProfiles.value.filter(
    (item) => item.id !== selectedCustomProfileId.value
  );
  persistCustomProfiles();
  selectedCustomProfileId.value = null;
  customProfileName.value = "";
  if (profile) {
    appendLog(`[app] Deleted custom target profile "${profile.name}".`);
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

const clearPreviewFrame = () => {
  revokeUrlRef(previewFrameUrl);
  previewFrameError.value = null;
};

const clearPreviewDebounce = () => {
  if (previewDebounceTimer !== null) {
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = null;
  }
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

const onSourceFileUpdate = (value: File | File[] | null) => {
  sourceFile.value = Array.isArray(value) ? (value[0] ?? null) : value;
};

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
    applySizingDefaults();
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
  if (hasRangeError.value) {
    processingError.value = "End seconds must be greater than start seconds.";
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

const schedulePreviewFrameRefresh = (delayMs = 350) => {
  if (
    !sourceFile.value ||
    !isVideoSource.value ||
    !isVideoOutput.value ||
    processing.value
  ) {
    clearPreviewDebounce();
    previewRefreshQueued = false;
    return;
  }

  clearPreviewDebounce();
  previewDebounceTimer = setTimeout(() => {
    previewDebounceTimer = null;
    if (previewFrameBusy.value) {
      previewRefreshQueued = true;
      return;
    }
    void generatePreviewFrame({ silentWhenUnavailable: true });
  }, delayMs);
};

const generatePreviewFrame = async (
  config: { silentWhenUnavailable?: boolean } = {}
) => {
  const silentWhenUnavailable = config.silentWhenUnavailable ?? false;
  const file = sourceFile.value;
  if (!file || !isVideoSource.value || !isVideoOutput.value) {
    if (!silentWhenUnavailable) {
      previewFrameError.value = "Select a video file to generate a frame preview.";
    }
    return;
  }
  if (previewFrameBusy.value || processing.value) {
    previewRefreshQueued = true;
    return;
  }
  const ready = await initializeFfmpeg();
  if (!ready) {
    if (!silentWhenUnavailable) {
      previewFrameError.value = "FFmpeg is not ready.";
    }
    return;
  }

  previewFrameBusy.value = true;
  previewFrameError.value = null;
  clearPreviewFrame();

  const options: Pick<
    VideoTranscodeOptions,
    "width" | "height" | "orientation" | "scaleMode" | "startSeconds"
  > = {
    orientation: orientation.value,
  };
  if (outputSizeMode.value === "custom" && width.value && height.value) {
    options.width = Math.max(1, Math.round(width.value));
    options.height = Math.max(1, Math.round(height.value));
    options.scaleMode = scaleMode.value;
  }
  if (typeof previewFrameSeconds.value === "number") {
    options.startSeconds = Math.max(0, previewFrameSeconds.value);
  }

  try {
    const result = await mediaProcessingService.renderVideoFramePreview(
      file,
      options,
      appendLog
    );
    const previewBlob = new Blob([result.data], { type: "image/png" });
    previewFrameUrl.value = URL.createObjectURL(previewBlob);
  } catch (error) {
    previewFrameError.value =
      error instanceof Error ? error.message : "Failed to render preview frame.";
  } finally {
    previewFrameBusy.value = false;
    if (previewRefreshQueued && !processing.value) {
      previewRefreshQueued = false;
      schedulePreviewFrameRefresh(50);
    }
  }
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

watch(sourceFile, (file) => {
  clearPreviewDebounce();
  previewRefreshQueued = false;
  clearOutput();
  clearPreviewFrame();
  sourceMetadata.value = null;
  sourceMetadataError.value = null;
  sourceMetadataLoading.value = false;
  processingError.value = null;
  processingProgress.value = 0;

  if (!file) {
    outputFileName.value = "";
    return;
  }

  outputFileName.value = buildDefaultOutputName(file.name, outputFormat.value);
  void loadSourceMetadata();
});

watch(outputFormat, (format) => {
  clearOutput();
  if (!sourceFile.value) {
    outputFileName.value = "";
    return;
  }
  outputFileName.value = buildDefaultOutputName(sourceFile.value.name, format);
});

watch(
  () => [
    sourceFile.value?.name ?? "",
    sourceFile.value?.size ?? 0,
    sourceFile.value?.lastModified ?? 0,
    isVideoSource.value,
    isVideoOutput.value,
    outputSizeMode.value,
    width.value ?? 0,
    height.value ?? 0,
    orientation.value,
    scaleMode.value,
    fps.value ?? 0,
    quality.value ?? 0,
    startSeconds.value ?? 0,
    endSeconds.value ?? 0,
    previewFrameSeconds.value ?? 0,
  ],
  () => {
    if (!sourceFile.value || !isVideoSource.value || !isVideoOutput.value) {
      clearPreviewDebounce();
      previewRefreshQueued = false;
      clearPreviewFrame();
      return;
    }
    schedulePreviewFrameRefresh();
  }
);

watch(previewFrameBusy, (isBusy) => {
  if (isBusy || !previewRefreshQueued) {
    return;
  }
  previewRefreshQueued = false;
  schedulePreviewFrameRefresh(50);
});

watch(targetSetupMode, (mode) => {
  if (!isVideoOutput.value) {
    return;
  }
  if (mode === "preset") {
    applySelectedBoardPreset();
    return;
  }
  if (selectedCustomProfile.value) {
    customProfileName.value = selectedCustomProfile.value.name;
    applySelectedCustomProfile();
  }
});

watch(selectedBoardPresetId, () => {
  if (targetSetupMode.value !== "preset" || !isVideoOutput.value) {
    return;
  }
  applySelectedBoardPreset();
});

watch(selectedCustomProfileId, () => {
  if (targetSetupMode.value !== "custom" || !isVideoOutput.value) {
    return;
  }
  const profile = selectedCustomProfile.value;
  if (!profile) {
    return;
  }
  customProfileName.value = profile.name;
  applySelectedCustomProfile();
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
  loadCustomProfiles();
  if (targetSetupMode.value === "preset") {
    applySelectedBoardPreset({ setOutputFormat: false, writeLog: false });
  } else {
    applySizingDefaults();
  }
  void initializeFfmpeg();
});

onBeforeUnmount(() => {
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
.panel-card {
  backdrop-filter: blur(6px);
  background: rgba(255, 255, 255, 0.92);
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
}

.preview-frame-image {
  width: 100%;
  height: 100%;
  max-height: 420px;
  object-fit: contain;
  background: #000;
}

.preview-placeholder {
  color: rgba(255, 255, 255, 0.72);
  padding: 0 16px;
  text-align: center;
}

.log-output :deep(textarea) {
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.8rem;
}
</style>
