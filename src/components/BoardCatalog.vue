<template>
  <v-card rounded="lg" elevation="4" class="panel-card board-catalog-card">
    <v-card-title class="d-flex align-center flex-wrap ga-3">
      <div>
        <div class="text-h6">Board catalog</div>
        <div class="text-caption text-medium-emphasis">
          Pick the closest development board preset before conversion.
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
          >
            <v-img
              :src="toPublicAssetPath(preset.imagePath)"
              :alt="preset.name"
              height="164"
              class="board-catalog-image"
            >
              <div class="board-catalog-size-overlay">
                {{ preset.width }}x{{ preset.height }}
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

            <v-card-actions>
              <v-btn
                color="primary"
                variant="flat"
                @click="emit('select-preset', preset.id)"
              >
                {{ isPresetSelected(preset.id) ? "Use selected board" : "Use this board" }}
              </v-btn>
              <v-btn
                v-if="preset.amazonUrl"
                :href="preset.amazonUrl"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="text"
                icon="mdi-cart-outline"
                color="warning"
                :aria-label="`Buy ${preset.name} on Amazon`"
                :title="`Buy ${preset.name} on Amazon`"
              />
              <v-btn
                v-if="preset.aliexpressUrl"
                :href="preset.aliexpressUrl"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="text"
                icon="mdi-shopping-outline"
                color="red-accent-2"
                :aria-label="`Buy ${preset.name} on AliExpress`"
                :title="`Buy ${preset.name} on AliExpress`"
              />
              <v-spacer />
              <v-chip
                v-if="isPresetSelected(preset.id)"
                size="small"
                color="success"
                variant="tonal"
              >
                Selected
              </v-chip>
            </v-card-actions>
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

const filteredPresets = computed(() => {
  const query = (searchQuery.value ?? "").trim().toLowerCase();
  if (!query) {
    return props.presets;
  }
  return props.presets.filter((preset) =>
    [preset.name, preset.notes, `${preset.width}x${preset.height}`]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
});

const toPublicAssetPath = (assetPath: string): string => {
  const normalized = assetPath.replace(/^\/+/, "");
  const baseUrl = import.meta.env.BASE_URL ?? "/";
  return baseUrl.endsWith("/") ? `${baseUrl}${normalized}` : `${baseUrl}/${normalized}`;
};

const isPresetSelected = (presetId: string) =>
  props.targetSetupMode === "preset" && props.selectedPresetId === presetId;

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

.board-catalog-item {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.board-catalog-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
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

.board-catalog-image-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(var(--v-theme-on-surface), 0.65);
  background: rgba(var(--v-theme-surface), 0.18);
  font-size: 0.8rem;
}
</style>
