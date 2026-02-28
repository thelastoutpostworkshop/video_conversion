<template>
  <v-card rounded="lg" elevation="4" class="panel-card board-catalog-card">
    <v-card-title class="d-flex align-center flex-wrap ga-3">
      <div>
        <div class="text-h6">Board catalog</div>
        <div class="text-caption text-medium-emphasis board-catalog-subtitle">
          Click a board card to select it. Buying and resource links are optional.
        </div>
      </div>
      <v-spacer />
      <v-text-field
        v-model="searchQuery"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
        label="Search boards"
        class="board-catalog-search"
      />
    </v-card-title>

    <v-divider />

    <v-card-text>
      <v-alert v-if="filteredPresets.length === 0" type="info" variant="tonal">
        No board presets match your search.
      </v-alert>

      <v-row v-else dense>
        <v-col
          v-for="preset in filteredPresets"
          :key="preset.id"
          cols="12"
          sm="6"
          lg="4"
          class="d-flex"
        >
          <v-card
            class="board-catalog-item flex-grow-1"
            :class="{ 'board-catalog-item--selected': isPresetSelected(preset.id) }"
            variant="tonal"
            role="button"
            tabindex="0"
            :aria-label="`Select ${preset.name}`"
            @click="selectPreset(preset.id)"
            @keydown.enter.prevent="selectPreset(preset.id)"
            @keydown.space.prevent="selectPreset(preset.id)"
          >
            <v-img
              :src="toPublicAssetPath(preset.imagePath)"
              :alt="preset.name"
              height="164"
              class="board-catalog-image board-catalog-image--previewable"
              role="button"
              tabindex="0"
              :aria-label="`Open larger image of ${preset.name}`"
              @click.stop="openImagePreview(preset)"
              @keydown.enter.prevent.stop="openImagePreview(preset)"
              @keydown.space.prevent.stop="openImagePreview(preset)"
            >
              <div class="board-catalog-size-overlay">
                {{ preset.width }}x{{ preset.height }}
              </div>
              <div
                v-if="isPresetSelected(preset.id)"
                class="board-catalog-selected-overlay"
              >
                Selected
              </div>
              <template #placeholder>
                <div class="board-catalog-image-placeholder">
                  Loading preview...
                </div>
              </template>
            </v-img>

            <v-card-title class="text-subtitle-1">
              {{ preset.name }}
            </v-card-title>

            <v-card-text class="pt-2">
              <div class="text-caption text-medium-emphasis mt-1">
                {{ preset.notes }}
              </div>
            </v-card-text>

            <v-card-actions class="board-catalog-actions">
              <v-btn
                size="small"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-check-circle-outline"
                @click.stop="selectPreset(preset.id)"
              >
                {{ isPresetSelected(preset.id) ? "Selected" : "Select" }}
              </v-btn>
              <v-spacer />
              <v-btn
                size="small"
                variant="text"
                color="secondary"
                prepend-icon="mdi-link-variant"
                :disabled="!hasSupportingLinks(preset)"
                @click.stop="toggleSupportingLinks(preset.id)"
              >
                {{
                  isSupportingLinksOpen(preset.id)
                    ? "Hide"
                    : "Explore"
                }}
              </v-btn>
            </v-card-actions>

            <v-expand-transition>
              <div v-if="isSupportingLinksOpen(preset.id)" class="board-catalog-links">
  

                <div v-if="hasBuyLinks(preset)" class="board-catalog-link-group">
                  <div class="text-caption board-catalog-link-group-title">
                    Buy board
                  </div>
                  <div class="board-catalog-link-row">
                    <v-btn
                      v-if="preset.amazonUrl"
                      :href="preset.amazonUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="tonal"
                      color="warning"
                      prepend-icon="mdi-cart-outline"
                      @click.stop
                    >
                      Amazon
                    </v-btn>
                    <v-btn
                      v-if="preset.aliexpressUrl"
                      :href="preset.aliexpressUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="tonal"
                      color="red-accent-2"
                      prepend-icon="mdi-shopping-outline"
                      @click.stop
                    >
                      AliExpress
                    </v-btn>
                  </div>
                </div>

                <div v-if="preset.projectLinks?.length" class="board-catalog-link-group">
                  <div class="text-caption board-catalog-link-group-title">
                    Projects
                  </div>
                  <div class="board-catalog-link-row">
                    <v-btn
                      v-for="(project, index) in preset.projectLinks"
                      :key="`${preset.id}-project-${index}`"
                      :href="project.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="text"
                      prepend-icon="mdi-source-repository"
                      @click.stop
                    >
                      {{ project.label }}
                    </v-btn>
                  </div>
                </div>

                <div v-if="preset.demoVideoLinks?.length" class="board-catalog-link-group">
                  <div class="text-caption board-catalog-link-group-title">
                    Demo videos
                  </div>
                  <div class="board-catalog-link-row">
                    <v-btn
                      v-for="(video, index) in preset.demoVideoLinks"
                      :key="`${preset.id}-video-${index}`"
                      :href="video.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="text"
                      prepend-icon="mdi-play-circle-outline"
                      @click.stop
                    >
                      {{ video.label }}
                    </v-btn>
                  </div>
                </div>
              </div>
            </v-expand-transition>
          </v-card>
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <v-card variant="tonal" class="board-catalog-custom">
        <v-card-title class="text-subtitle-1">
          Use custom board size
        </v-card-title>
        <v-card-text>
          <div class="text-caption text-medium-emphasis mb-3">
            Enter your screen dimensions to create a custom board target.
          </div>

          <v-row dense>
            <v-col cols="12" sm="4">
              <v-text-field
                :model-value="customBoardWidth"
                label="Screen width"
                type="number"
                density="comfortable"
                hide-details="auto"
                :disabled="processing"
                @update:model-value="updateCustomBoardWidth"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                :model-value="customBoardHeight"
                label="Screen height"
                type="number"
                density="comfortable"
                hide-details="auto"
                :disabled="processing"
                @update:model-value="updateCustomBoardHeight"
              />
            </v-col>
            <v-col cols="12" sm="4" class="d-flex align-center justify-sm-end">
              <v-btn
                color="primary"
                variant="flat"
                :disabled="processing"
                @click="emit('select-custom-board')"
              >
                Use custom board
              </v-btn>
            </v-col>
          </v-row>

          <v-alert
            v-if="customBoardValidationMessage"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-2"
          >
            {{ customBoardValidationMessage }}
          </v-alert>

          <v-chip
            v-if="isCustomBoardSelected && customTargetWidth && customTargetHeight"
            color="success"
            variant="tonal"
            size="small"
            class="mt-2"
          >
            Custom board selected ({{ customTargetWidth }}x{{ customTargetHeight }})
          </v-chip>
        </v-card-text>
      </v-card>
    </v-card-text>

    <v-dialog
      :model-value="Boolean(imagePreviewPreset)"
      max-width="940"
      @update:model-value="handleImagePreviewModelUpdate"
    >
      <v-card rounded="lg" class="board-catalog-preview-dialog">
        <v-card-title class="d-flex align-center ga-2">
          <div class="text-subtitle-1">
            {{ imagePreviewPreset?.name }}
          </div>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="closeImagePreview"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="board-catalog-preview-dialog-body">
          <template v-if="imagePreviewPreset">
            <v-img
              :src="toPublicAssetPath(imagePreviewPreset.imagePath)"
              :alt="`${imagePreviewPreset.name} preview`"
              class="board-catalog-preview-image"
            >
              <div class="board-catalog-size-overlay board-catalog-size-overlay--dialog">
                {{ imagePreviewPreset.width }}x{{ imagePreviewPreset.height }}
              </div>
            </v-img>

            <div class="board-catalog-preview-details">
              <div class="board-catalog-preview-actions">
                <v-btn
                  size="small"
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-check-circle-outline"
                  @click="selectPreset(imagePreviewPreset.id); closeImagePreview()"
                >
                  {{
                    isPresetSelected(imagePreviewPreset.id)
                      ? "Selected"
                      : "Select this board"
                  }}
                </v-btn>
                <v-chip
                  v-if="isPresetSelected(imagePreviewPreset.id)"
                  size="small"
                  color="success"
                  variant="tonal"
                >
                  Selected
                </v-chip>
              </div>

              <div class="text-body-2 text-medium-emphasis mt-2">
                {{ imagePreviewPreset.notes }}
              </div>

              <div
                v-if="hasSupportingLinks(imagePreviewPreset)"
                class="board-catalog-preview-links"
              >
                <div v-if="hasBuyLinks(imagePreviewPreset)" class="board-catalog-link-group">
                  <div class="text-caption board-catalog-link-group-title">
                    Buy board
                  </div>
                  <div class="board-catalog-link-row">
                    <v-btn
                      v-if="imagePreviewPreset.amazonUrl"
                      :href="imagePreviewPreset.amazonUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="tonal"
                      color="warning"
                      prepend-icon="mdi-cart-outline"
                    >
                      Amazon
                    </v-btn>
                    <v-btn
                      v-if="imagePreviewPreset.aliexpressUrl"
                      :href="imagePreviewPreset.aliexpressUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="tonal"
                      color="red-accent-2"
                      prepend-icon="mdi-shopping-outline"
                    >
                      AliExpress
                    </v-btn>
                  </div>
                </div>

                <div v-if="imagePreviewPreset.projectLinks?.length" class="board-catalog-link-group">
                  <div class="text-caption board-catalog-link-group-title">
                    Projects
                  </div>
                  <div class="board-catalog-link-row">
                    <v-btn
                      v-for="(project, index) in imagePreviewPreset.projectLinks"
                      :key="`${imagePreviewPreset.id}-dialog-project-${index}`"
                      :href="project.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="text"
                      prepend-icon="mdi-source-repository"
                    >
                      {{ project.label }}
                    </v-btn>
                  </div>
                </div>

                <div v-if="imagePreviewPreset.demoVideoLinks?.length" class="board-catalog-link-group">
                  <div class="text-caption board-catalog-link-group-title">
                    Demo videos
                  </div>
                  <div class="board-catalog-link-row">
                    <v-btn
                      v-for="(video, index) in imagePreviewPreset.demoVideoLinks"
                      :key="`${imagePreviewPreset.id}-dialog-video-${index}`"
                      :href="video.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="text"
                      prepend-icon="mdi-play-circle-outline"
                    >
                      {{ video.label }}
                    </v-btn>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { BoardPreset } from "@/config/boardPresets";

type TargetSetupMode = "preset" | "custom";

interface BoardCatalogProps {
  presets: BoardPreset[];
  targetSetupMode: TargetSetupMode;
  selectedPresetId: string;
  processing: boolean;
  customBoardWidth: number | null;
  customBoardHeight: number | null;
  customBoardValidationMessage: string | null;
  isCustomBoardSelected: boolean;
  customTargetWidth: number | null;
  customTargetHeight: number | null;
}

const props = defineProps<BoardCatalogProps>();

const emit = defineEmits<{
  (event: "select-preset", presetId: string): void;
  (event: "update:custom-board-width", value: number | null): void;
  (event: "update:custom-board-height", value: number | null): void;
  (event: "select-custom-board"): void;
}>();

const searchQuery = ref<string | null>("");
const expandedSupportingPresetId = ref<string | null>(null);
const imagePreviewPreset = ref<BoardPreset | null>(null);

const filteredPresets = computed(() => {
  const query = (searchQuery.value ?? "").trim().toLowerCase();
  if (!query) {
    return props.presets;
  }
  return props.presets.filter((preset) => {
    const searchableText = [
      preset.id,
      preset.name,
      preset.notes,
      `${preset.width}x${preset.height}`,
      ...(preset.projectLinks ?? []).map((link) => link.label),
      ...(preset.demoVideoLinks ?? []).map((link) => link.label),
    ]
      .join(" ")
      .toLowerCase();
    return searchableText.includes(query);
  });
});

const toPublicAssetPath = (assetPath: string): string => {
  const normalized = assetPath.replace(/^\/+/, "");
  const baseUrl = import.meta.env.BASE_URL ?? "/";
  return baseUrl.endsWith("/") ? `${baseUrl}${normalized}` : `${baseUrl}/${normalized}`;
};

const isPresetSelected = (presetId: string) =>
  props.targetSetupMode === "preset" && props.selectedPresetId === presetId;

const hasBuyLinks = (preset: BoardPreset): boolean =>
  Boolean(preset.amazonUrl || preset.aliexpressUrl);

const hasSupportingLinks = (preset: BoardPreset): boolean =>
  hasBuyLinks(preset) ||
  Boolean(preset.projectLinks?.length) ||
  Boolean(preset.demoVideoLinks?.length);

const isSupportingLinksOpen = (presetId: string): boolean =>
  expandedSupportingPresetId.value === presetId;

const toggleSupportingLinks = (presetId: string) => {
  expandedSupportingPresetId.value =
    expandedSupportingPresetId.value === presetId ? null : presetId;
};

const openImagePreview = (preset: BoardPreset) => {
  imagePreviewPreset.value = preset;
};

const closeImagePreview = () => {
  imagePreviewPreset.value = null;
};

const handleImagePreviewModelUpdate = (isOpen: boolean) => {
  if (!isOpen) {
    closeImagePreview();
  }
};

const selectPreset = (presetId: string) => {
  emit("select-preset", presetId);
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

const updateCustomBoardWidth = (value: string | number | null) => {
  emit("update:custom-board-width", toPositiveNullable(value));
};

const updateCustomBoardHeight = (value: string | number | null) => {
  emit("update:custom-board-height", toPositiveNullable(value));
};
</script>

<style scoped>
.board-catalog-card {
  min-height: 68vh;
}

.board-catalog-search {
  min-width: 220px;
  max-width: 320px;
}

.board-catalog-subtitle {
  max-width: 640px;
  line-height: 1.35;
}

.board-catalog-item {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  cursor: pointer;
}

.board-catalog-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
}

.board-catalog-item:focus-visible {
  outline: 2px solid rgba(var(--v-theme-primary), 0.9);
  outline-offset: 2px;
}

.board-catalog-item--selected {
  border-color: rgba(var(--v-theme-success), 0.75);
  box-shadow: 0 0 0 1px rgba(var(--v-theme-success), 0.35);
}

.board-catalog-image {
  position: relative;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background:
    radial-gradient(
      140% 90% at 10% 10%,
      rgba(var(--v-theme-primary), 0.26),
      transparent 55%
    ),
    radial-gradient(
      120% 100% at 92% 80%,
      rgba(var(--v-theme-secondary), 0.22),
      transparent 58%
    ),
    repeating-linear-gradient(
      -45deg,
      rgba(var(--v-theme-on-surface), 0.04) 0 10px,
      rgba(var(--v-theme-on-surface), 0.015) 10px 20px
    ),
    linear-gradient(
      135deg,
      rgba(var(--v-theme-surface-variant), 0.62) 0%,
      rgba(var(--v-theme-surface), 0.42) 100%
    );
}

.board-catalog-image :deep(.v-img__img) {
  object-fit: contain !important;
  object-position: center center;
  filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.2));
}

.board-catalog-image--previewable {
  cursor: zoom-in;
}

.board-catalog-image--previewable:focus-visible {
  outline: 2px solid rgba(var(--v-theme-primary), 0.9);
  outline-offset: -2px;
}

.board-catalog-size-overlay {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 2;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  background: rgba(var(--v-theme-surface), 0.72);
  backdrop-filter: blur(6px);
  color: rgb(var(--v-theme-on-surface));
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  pointer-events: none;
}

.board-catalog-selected-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-success), 0.55);
  background: rgba(var(--v-theme-surface), 0.74);
  color: rgb(var(--v-theme-success));
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1;
  pointer-events: none;
}

.board-catalog-image-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(var(--v-theme-on-surface), 0.65);
  background: rgba(var(--v-theme-surface), 0.18);
  font-size: 0.8rem;
}

.board-catalog-actions {
  align-items: center;
  gap: 8px;
}

.board-catalog-links {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  margin-top: 4px;
  padding: 10px 16px 14px;
}

.board-catalog-link-group + .board-catalog-link-group {
  margin-top: 10px;
}

.board-catalog-link-group-title {
  font-weight: 700;
  letter-spacing: 0.01em;
  color: rgba(var(--v-theme-on-surface), 0.74);
  margin-bottom: 4px;
}

.board-catalog-link-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.board-catalog-preview-dialog-body {
  padding: 12px !important;
  display: grid;
  gap: 12px;
}

.board-catalog-preview-image {
  min-height: min(72vh, 680px);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  overflow: hidden;
  background:
    radial-gradient(
      140% 90% at 10% 10%,
      rgba(var(--v-theme-primary), 0.26),
      transparent 55%
    ),
    radial-gradient(
      120% 100% at 92% 80%,
      rgba(var(--v-theme-secondary), 0.22),
      transparent 58%
    ),
    linear-gradient(
      135deg,
      rgba(var(--v-theme-surface-variant), 0.58) 0%,
      rgba(var(--v-theme-surface), 0.44) 100%
    );
}

.board-catalog-preview-image :deep(.v-img__img) {
  object-fit: contain !important;
  object-position: center center;
}

.board-catalog-size-overlay--dialog {
  font-size: 1.06rem;
}

.board-catalog-preview-details {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 12px;
  padding: 12px;
  background: rgba(var(--v-theme-surface), 0.4);
}

.board-catalog-preview-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.board-catalog-preview-links {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  margin-top: 12px;
  padding-top: 10px;
}

@media (max-width: 640px) {
  .board-catalog-search {
    min-width: 100%;
    max-width: 100%;
  }

  .board-catalog-actions {
    flex-wrap: wrap;
  }

  .board-catalog-actions :deep(.v-spacer) {
    display: none;
  }
}
</style>
