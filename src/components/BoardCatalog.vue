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
      <div class="board-catalog-header-actions">
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
        <v-btn
          href="https://github.com/thelastoutpostworkshop/video_conversion/issues/new/choose"
          target="_blank"
          rel="noopener noreferrer"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-plus-circle-outline"
          class="board-catalog-request-btn"
        >
          Request a board
        </v-btn>
      </div>
    </v-card-title>

    <v-divider />

    <v-card-text>
      <v-alert v-if="filteredPresets.length === 0" type="info" variant="tonal">
        No board presets match your search.
      </v-alert>

      <v-row v-else density="comfortable">
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
                @click.stop="openImagePreview(preset)"
              >
                Explore
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <v-card
        variant="tonal"
        class="board-catalog-custom"
        :class="{ 'board-catalog-custom--selected': isCustomBoardSelected }"
      >
        <v-card-title class="text-subtitle-1">
          Use custom board size
        </v-card-title>
        <v-card-text>
          <div class="text-caption text-medium-emphasis mb-3">
            Enter your screen dimensions to create a custom board target.
          </div>

          <v-row density="comfortable">
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

          <v-row density="comfortable">
            <v-col cols="12">
              <v-checkbox
                :model-value="customBoardRoundDisplay"
                label="Round screen"
                density="comfortable"
                hide-details
                :disabled="processing || !canSelectCustomRoundDisplay"
                @update:model-value="updateCustomBoardRoundDisplay"
              />
              <div
                v-if="hasCustomBoardDimensionInput && !canSelectCustomRoundDisplay"
                class="text-caption text-medium-emphasis mt-n2"
              >
                Round screens require matching width and height.
              </div>
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
            Custom board selected
            ({{ customTargetWidth }}x{{ customTargetHeight }}{{ customBoardRoundDisplay ? ", round" : "" }})
          </v-chip>
        </v-card-text>
      </v-card>
    </v-card-text>

    <v-dialog
      :model-value="Boolean(imagePreviewPreset)"
      max-width="1080"
      @update:model-value="handleImagePreviewModelUpdate"
    >
      <v-card rounded="lg" class="board-catalog-preview-dialog">
        <v-card-title class="d-flex align-center ga-2">
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
            <div class="board-catalog-preview-layout">
              <div class="board-catalog-preview-focus">
                <div class="board-catalog-preview-focus-header">
                  <div class="board-catalog-preview-header-top">
                    <div class="board-catalog-preview-header-copy">
                      <div class="board-catalog-preview-name">
                        {{ imagePreviewPreset.name }}
                      </div>
                      <div class="board-catalog-preview-description">
                        {{ imagePreviewPreset.notes }}
                      </div>
                    </div>
                    <div
                      v-if="hasBuyLinks(imagePreviewPreset)"
                      class="board-catalog-preview-buy-panel"
                      :class="{
                        'board-catalog-preview-buy-panel--single':
                          getBuyLinkCount(imagePreviewPreset) === 1,
                      }"
                    >
                      <div class="text-caption board-catalog-link-group-title mb-1">
                        Buy this board
                      </div>
                      <div
                        class="board-catalog-buy-row"
                        :class="{
                          'board-catalog-buy-row--single': getBuyLinkCount(imagePreviewPreset) === 1,
                        }"
                      >
                        <v-btn
                          v-if="imagePreviewPreset.amazonUrl"
                          :href="imagePreviewPreset.amazonUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          variant="flat"
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
                          variant="flat"
                          color="red-accent-2"
                          prepend-icon="mdi-shopping-outline"
                        >
                          AliExpress
                        </v-btn>
                      </div>
                    </div>
                  </div>
                  <div class="board-catalog-preview-meta-row">
                    <v-chip class="board-catalog-size-chip" variant="flat" color="primary">
                      <v-icon icon="mdi-aspect-ratio" size="15" class="me-1" />
                      Screen {{ imagePreviewPreset.width }}x{{ imagePreviewPreset.height }}
                    </v-chip>
                    <v-chip
                      v-if="previewProjects.length"
                      size="small"
                      variant="tonal"
                      color="info"
                    >
                      <v-icon icon="mdi-view-grid-outline" size="14" class="me-1" />
                      {{ previewProjects.length }} project{{ previewProjects.length > 1 ? "s" : "" }}
                    </v-chip>
                    <v-chip
                      v-if="imagePreviewPreset.roundDisplay"
                      size="small"
                      variant="tonal"
                      color="secondary"
                    >
                      Round display
                    </v-chip>
                  </div>
                </div>

                <div class="board-catalog-preview-details">
                  <div class="board-catalog-preview-links">
                    <div v-if="previewProjects.length" class="board-catalog-link-group">
                      <div class="board-catalog-link-group-title board-catalog-project-list-title">
                        <span>The Last Outpost projects</span>
                        <v-chip size="small" color="primary" variant="tonal">
                          {{ previewProjects.length }}
                        </v-chip>
                      </div>
                      <div class="board-catalog-project-grid">
                        <v-card
                          v-for="(project, index) in previewProjects"
                          :key="`${imagePreviewPreset.id}-dialog-project-${index}`"
                          variant="tonal"
                          class="board-catalog-project-card"
                          @mouseenter="setProjectHovered(imagePreviewPreset.id, index)"
                          @mouseleave="clearProjectHovered(imagePreviewPreset.id, index)"
                        >
                          <div class="board-catalog-project-content">
                            <v-img
                              :src="
                                toPublicAssetPath(
                                  resolveProjectPreviewImagePath(
                                    imagePreviewPreset.id,
                                    index,
                                    project
                                  )
                                )
                              "
                              :alt="`${project.name} preview`"
                              class="board-catalog-project-image"
                            >
                              <div
                                v-if="project.hoverImagePath && !isProjectHovered(imagePreviewPreset.id, index)"
                                class="board-catalog-project-hover-hint"
                              >
                                Hover for animated preview
                              </div>
                            </v-img>
                            <div class="board-catalog-project-body">
                              <div class="board-catalog-project-head">
                                <div class="board-catalog-project-title">
                                  {{ project.name }}
                                </div>
                                <div class="board-catalog-project-description">
                                  {{ project.description }}
                                </div>
                              </div>
                              <div class="board-catalog-link-row board-catalog-link-row--project">
                                <v-btn
                                  :href="project.url"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  size="small"
                                  variant="flat"
                                  color="primary"
                                  prepend-icon="mdi-source-repository"
                                >
                                  Open project
                                </v-btn>
                                <v-btn
                                  v-for="(demo, demoIndex) in project.demos"
                                  :key="`${imagePreviewPreset.id}-dialog-project-${index}-demo-${demoIndex}`"
                                  :href="demo.url"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  size="small"
                                  variant="tonal"
                                  color="secondary"
                                  prepend-icon="mdi-play-circle-outline"
                                >
                                  {{ demo.label }}
                                </v-btn>
                              </div>
                            </div>
                          </div>
                        </v-card>
                      </div>
                    </div>

                    <v-alert
                      v-if="!hasSupportingLinks(imagePreviewPreset)"
                      type="info"
                      variant="tonal"
                      density="compact"
                      class="mt-2"
                    >
                      No project links available for this board yet.
                    </v-alert>
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
import type { BoardPreset, BoardReferenceLink } from "@/config/boardPresets";

type TargetSetupMode = "preset" | "custom";

interface BoardCatalogProps {
  presets: BoardPreset[];
  targetSetupMode: TargetSetupMode;
  selectedPresetId: string;
  processing: boolean;
  customBoardWidth: number | null;
  customBoardHeight: number | null;
  customBoardRoundDisplay: boolean;
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
  (event: "update:custom-board-round-display", value: boolean): void;
  (event: "select-custom-board"): void;
}>();

const searchQuery = ref<string | null>("");
const imagePreviewPreset = ref<BoardPreset | null>(null);

interface BoardPreviewProject {
  name: string;
  description: string;
  url: string;
  imagePath: string;
  hoverImagePath: string | null;
  demos: BoardReferenceLink[];
}

const normalizeReferenceLinks = (
  links: BoardReferenceLink[] | undefined
): BoardReferenceLink[] =>
  (links ?? [])
    .filter(
      (link) =>
        typeof link.label === "string" &&
        link.label.trim().length > 0 &&
        typeof link.url === "string" &&
        link.url.trim().length > 0
    )
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }));

const buildProjectDescription = (
  explicitDescription: string | undefined,
  tutorialCount: number
): string => {
  if (typeof explicitDescription === "string" && explicitDescription.trim().length > 0) {
    return explicitDescription.trim();
  }
  return tutorialCount > 0
    ? `Open-source project with ${tutorialCount} tutorial${tutorialCount > 1 ? "s" : ""}.`
    : "Open-source project tailored for this board.";
};

const buildPreviewProjects = (preset: BoardPreset): BoardPreviewProject[] => {
  const projectEntries = (preset.projects ?? [])
    .filter(
      (project) =>
        typeof project.name === "string" &&
        project.name.trim().length > 0 &&
        typeof project.url === "string" &&
        project.url.trim().length > 0
      )
    .map((project) => {
      const demos = normalizeReferenceLinks(project.demos);
      return {
        imagePath:
          typeof project.imagePath === "string" && project.imagePath.trim().length > 0
            ? project.imagePath.trim()
            : preset.imagePath,
        hoverImagePath:
          typeof project.hoverImagePath === "string" && project.hoverImagePath.trim().length > 0
            ? project.hoverImagePath.trim()
            : null,
        name: project.name.trim(),
        description: buildProjectDescription(project.description, demos.length),
        url: project.url.trim(),
        demos,
      };
    });
  if (projectEntries.length > 0) {
    return projectEntries;
  }

  const legacyProjects = normalizeReferenceLinks(preset.projectLinks);
  const legacyDemos = normalizeReferenceLinks(preset.demoVideoLinks);
  if (legacyProjects.length === 0 && legacyDemos.length === 0) {
    return [];
  }

  if (legacyProjects.length === 0) {
    return legacyDemos.map((demo) => ({
      name: demo.label,
      description: buildProjectDescription(undefined, 1),
      url: demo.url,
      imagePath: preset.imagePath,
      hoverImagePath: null,
      demos: [demo],
    }));
  }

  const legacyDemoMap = new Map<string, BoardReferenceLink[]>();
  for (const demo of legacyDemos) {
    const key = demo.label.trim().toLowerCase();
    const bucket = legacyDemoMap.get(key) ?? [];
    bucket.push(demo);
    legacyDemoMap.set(key, bucket);
  }

  return legacyProjects.map((project) => {
    const key = project.label.trim().toLowerCase();
    const matchingDemos = legacyDemoMap.get(key) ?? [];
    const demos =
      matchingDemos.length > 0 ? matchingDemos : legacyDemos.length === 1 ? legacyDemos : [];
    return {
      name: project.label,
      description: buildProjectDescription(undefined, demos.length),
      url: project.url,
      imagePath: preset.imagePath,
      hoverImagePath: null,
      demos,
    };
  });
};

const filteredPresets = computed(() => {
  const query = (searchQuery.value ?? "").trim().toLowerCase();
  if (!query) {
    return props.presets;
  }
  return props.presets.filter((preset) => {
    const projectTokens = buildPreviewProjects(preset).flatMap((project) => [
      project.name,
      ...project.demos.map((demo) => demo.label),
    ]);
    const searchableText = [
      preset.id,
      preset.name,
      preset.notes,
      `${preset.width}x${preset.height}`,
      ...projectTokens,
    ]
      .join(" ")
      .toLowerCase();
    return searchableText.includes(query);
  });
});

const previewProjects = computed(() => {
  const preset = imagePreviewPreset.value;
  return preset ? buildPreviewProjects(preset) : [];
});

const hoveredProjectKey = ref<string | null>(null);

const buildProjectHoverKey = (presetId: string, index: number) => `${presetId}-${index}`;

const setProjectHovered = (presetId: string, index: number) => {
  hoveredProjectKey.value = buildProjectHoverKey(presetId, index);
};

const clearProjectHovered = (presetId: string, index: number) => {
  const key = buildProjectHoverKey(presetId, index);
  if (hoveredProjectKey.value === key) {
    hoveredProjectKey.value = null;
  }
};

const isProjectHovered = (presetId: string, index: number) =>
  hoveredProjectKey.value === buildProjectHoverKey(presetId, index);

const resolveProjectPreviewImagePath = (
  presetId: string,
  index: number,
  project: BoardPreviewProject
) =>
  isProjectHovered(presetId, index) && project.hoverImagePath
    ? project.hoverImagePath
    : project.imagePath;

const toPublicAssetPath = (assetPath: string): string => {
  if (/^(?:[a-z]+:)?\/\//i.test(assetPath) || assetPath.startsWith("data:")) {
    return assetPath;
  }
  const normalized = assetPath.replace(/^\/+/, "");
  const baseUrl = import.meta.env.BASE_URL ?? "/";
  return baseUrl.endsWith("/") ? `${baseUrl}${normalized}` : `${baseUrl}/${normalized}`;
};

const isPresetSelected = (presetId: string) =>
  props.targetSetupMode === "preset" && props.selectedPresetId === presetId;

const hasBuyLinks = (preset: BoardPreset): boolean =>
  Boolean(preset.amazonUrl || preset.aliexpressUrl);

const getBuyLinkCount = (preset: BoardPreset): number =>
  (preset.amazonUrl ? 1 : 0) + (preset.aliexpressUrl ? 1 : 0);

const hasSupportingLinks = (preset: BoardPreset): boolean =>
  hasBuyLinks(preset) ||
  buildPreviewProjects(preset).length > 0;

const openImagePreview = (preset: BoardPreset) => {
  hoveredProjectKey.value = null;
  imagePreviewPreset.value = preset;
};

const closeImagePreview = () => {
  hoveredProjectKey.value = null;
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

const toRoundedPositiveDimension = (value: number | null): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.max(1, Math.round(value));
};

const normalizedCustomBoardWidth = computed(() =>
  toRoundedPositiveDimension(props.customBoardWidth)
);

const normalizedCustomBoardHeight = computed(() =>
  toRoundedPositiveDimension(props.customBoardHeight)
);

const hasCustomBoardDimensionInput = computed(
  () =>
    normalizedCustomBoardWidth.value !== null || normalizedCustomBoardHeight.value !== null
);

const canSelectCustomRoundDisplay = computed(
  () =>
    normalizedCustomBoardWidth.value !== null &&
    normalizedCustomBoardHeight.value !== null &&
    normalizedCustomBoardWidth.value === normalizedCustomBoardHeight.value
);

const updateCustomBoardWidth = (value: string | number | null) => {
  emit("update:custom-board-width", toPositiveNullable(value));
};

const updateCustomBoardHeight = (value: string | number | null) => {
  emit("update:custom-board-height", toPositiveNullable(value));
};

const updateCustomBoardRoundDisplay = (value: boolean | null) => {
  emit("update:custom-board-round-display", value === true);
};
</script>

<style scoped>
.board-catalog-card {
  min-height: 68vh;
}

.board-catalog-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.board-catalog-search {
  min-width: 220px;
  max-width: 320px;
}

.board-catalog-request-btn {
  white-space: nowrap;
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
  box-shadow:
    0 0 0 1px rgba(var(--v-theme-success), 0.35),
    0 0 18px rgba(var(--v-theme-success), 0.34),
    0 0 36px rgba(var(--v-theme-success), 0.2);
  animation: selected-glow-pulse 1.8s ease-in-out infinite;
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

.board-catalog-link-group + .board-catalog-link-group {
  margin-top: 10px;
}

.board-catalog-link-group-title {
  font-weight: 700;
  letter-spacing: 0.01em;
  color: rgba(var(--v-theme-on-surface), 0.74);
  margin-bottom: 4px;
}

.board-catalog-project-list-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 1.02rem;
  font-weight: 800;
  color: rgba(var(--v-theme-on-surface), 0.92);
  margin-bottom: 12px;
}

.board-catalog-link-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.board-catalog-preview-dialog-body {
  padding: 14px !important;
}

.board-catalog-preview-layout {
  display: block;
}

.board-catalog-preview-focus {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 14px;
  padding: 14px;
  background:
    radial-gradient(
      130% 75% at 8% -10%,
      rgba(var(--v-theme-primary), 0.24),
      transparent 56%
    ),
    linear-gradient(
      135deg,
      rgba(var(--v-theme-surface-variant), 0.44) 0%,
      rgba(var(--v-theme-surface), 0.56) 100%
    );
}

.board-catalog-preview-focus-header {
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  background:
    linear-gradient(
      180deg,
      rgba(var(--v-theme-surface), 0.92) 0%,
      rgba(var(--v-theme-surface), 0.74) 100%
    );
  backdrop-filter: blur(8px);
}

.board-catalog-preview-header-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
}

.board-catalog-preview-header-copy {
  max-width: 760px;
}

.board-catalog-preview-buy-panel {
  min-width: 212px;
  border: 1px solid rgba(var(--v-theme-primary), 0.28);
  border-radius: 12px;
  padding: 11px;
  background: linear-gradient(
    160deg,
    rgba(var(--v-theme-primary), 0.2) 0%,
    rgba(var(--v-theme-surface), 0.22) 100%
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.board-catalog-preview-buy-panel--single {
  min-width: 0;
  width: fit-content;
}

.board-catalog-buy-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.board-catalog-buy-row--single :deep(.v-btn) {
  min-width: 140px;
  justify-content: center;
}

.board-catalog-preview-name {
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.15;
}

.board-catalog-preview-description {
  margin-top: 8px;
  color: rgba(var(--v-theme-on-surface), 0.9);
  font-size: 0.92rem;
  line-height: 1.42;
}

.board-catalog-preview-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.board-catalog-size-chip {
  font-weight: 800;
  letter-spacing: 0.01em;
}

.board-catalog-preview-details {
  margin-top: 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 12px;
  padding: 14px;
  background: rgba(var(--v-theme-surface), 0.5);
}

.board-catalog-preview-links {
  margin-top: 0;
  padding-top: 0;
}

.board-catalog-project-grid {
  display: grid;
  gap: 10px;
}

.board-catalog-project-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.52);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
  overflow: hidden;
}

.board-catalog-project-card:hover {
  transform: translateY(-1px);
  border-color: rgba(var(--v-theme-primary), 0.28);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.14);
}

.board-catalog-project-card:focus-within {
  border-color: rgba(var(--v-theme-primary), 0.55);
  box-shadow: 0 0 0 1px rgba(var(--v-theme-primary), 0.45);
}

.board-catalog-project-content {
  display: grid;
  grid-template-columns: minmax(300px, 50%) minmax(0, 1fr);
  align-items: stretch;
}

.board-catalog-project-image {
  min-height: 176px;
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background:
    radial-gradient(
      130% 90% at 0% 0%,
      rgba(var(--v-theme-primary), 0.22),
      transparent 62%
    ),
    rgba(var(--v-theme-surface), 0.66);
}

.board-catalog-project-image :deep(.v-img__img) {
  object-fit: contain !important;
  object-position: center center;
}

.board-catalog-project-hover-hint {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 2;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  background: rgba(var(--v-theme-surface), 0.8);
  color: rgba(var(--v-theme-on-surface), 0.9);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  pointer-events: none;
}

.board-catalog-project-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: flex-start;
}

.board-catalog-project-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.board-catalog-project-title {
  font-size: 1.03rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.25;
  color: rgba(var(--v-theme-on-surface), 0.95);
}

.board-catalog-project-description {
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.85rem;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
}

.board-catalog-link-row--project {
  gap: 8px;
  align-items: flex-start;
}

.board-catalog-link-row--project :deep(.v-btn) {
  min-width: 0;
}

.board-catalog-custom {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.board-catalog-custom--selected {
  border-color: rgba(var(--v-theme-success), 0.75) !important;
  box-shadow:
    0 0 0 1px rgba(var(--v-theme-success), 0.35),
    0 0 18px rgba(var(--v-theme-success), 0.34),
    0 0 36px rgba(var(--v-theme-success), 0.2);
  animation: selected-glow-pulse 1.8s ease-in-out infinite;
}

@keyframes selected-glow-pulse {
  0% {
    box-shadow:
      0 0 0 1px rgba(var(--v-theme-success), 0.35),
      0 0 12px rgba(var(--v-theme-success), 0.24),
      0 0 24px rgba(var(--v-theme-success), 0.14);
  }

  50% {
    box-shadow:
      0 0 0 1px rgba(var(--v-theme-success), 0.42),
      0 0 22px rgba(var(--v-theme-success), 0.45),
      0 0 44px rgba(var(--v-theme-success), 0.24);
  }

  100% {
    box-shadow:
      0 0 0 1px rgba(var(--v-theme-success), 0.35),
      0 0 12px rgba(var(--v-theme-success), 0.24),
      0 0 24px rgba(var(--v-theme-success), 0.14);
  }
}

@media (max-width: 640px) {
  .board-catalog-preview-header-top {
    grid-template-columns: 1fr;
  }

  .board-catalog-preview-buy-panel {
    min-width: 0;
    width: 100%;
  }

  .board-catalog-project-content {
    grid-template-columns: 1fr;
  }

  .board-catalog-project-image {
    min-height: 168px;
    border-right: none;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  }

  .board-catalog-project-body {
    gap: 12px;
  }

  .board-catalog-project-title {
    font-size: 1.02rem;
  }

  .board-catalog-link-row--project {
    flex-direction: column;
    align-items: stretch;
  }

  .board-catalog-link-row--project :deep(.v-btn) {
    width: 100%;
    justify-content: flex-start;
  }

  .board-catalog-header-actions {
    width: 100%;
  }

  .board-catalog-search {
    min-width: 100%;
    max-width: 100%;
  }

  .board-catalog-request-btn {
    width: 100%;
  }

  .board-catalog-actions {
    flex-wrap: wrap;
  }

  .board-catalog-actions :deep(.v-spacer) {
    display: none;
  }
}
</style>
