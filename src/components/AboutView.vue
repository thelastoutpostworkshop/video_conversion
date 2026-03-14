<template>
  <v-card rounded="lg" elevation="4" class="about-root-card">
    <v-card-text class="about-view-body pa-4 pa-md-6">
      <v-sheet class="about-hero pa-4 pa-md-5" rounded="xl" border>
        <div class="about-hero-copy">
          <div class="text-overline about-hero-kicker">
            Local-first workflow
          </div>
          <div class="text-h5 font-weight-bold mt-1">
            Convert videos for ESP boards, locally
          </div>
          <div class="text-body-2 text-medium-emphasis mt-2">
            Pick your board, tune conversion settings, and export board-ready media
            directly in your browser.
          </div>
        </div>
        <div class="about-hero-badges">
          <v-chip
            size="small"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-shield-check-outline"
          >
            Runs on your computer
          </v-chip>
          <v-chip
            size="small"
            color="success"
            variant="tonal"
            prepend-icon="mdi-gift-outline"
          >
            Free to use
          </v-chip>
        </div>
      </v-sheet>

      <v-row density="comfortable" class="about-steps-row">
        <v-col
          v-for="step in aboutSteps"
          :key="step.number"
          cols="12"
          md="4"
        >
          <v-sheet class="about-step-card pa-4 h-100" rounded="lg" border>
            <div class="about-step-number">
              Step {{ step.number }}
            </div>
            <div class="text-subtitle-1 font-weight-medium mt-2">
              {{ step.title }}
            </div>
            <div class="text-body-2 text-medium-emphasis mt-1">
              {{ step.description }}
            </div>
          </v-sheet>
        </v-col>
      </v-row>

      <v-row density="comfortable">
        <v-col cols="12" md="6">
          <v-sheet class="about-surface pa-4 h-100" rounded="lg" border>
            <div class="text-subtitle-1 font-weight-medium mb-3">
              What you can export
            </div>
            <div class="about-export-grid">
              <v-sheet
                v-for="format in aboutExportFormats"
                :key="format.label"
                class="about-export-card pa-3"
                rounded="lg"
                border
              >
                <div class="d-flex align-center ga-2">
                  <v-icon :icon="format.icon" size="18" color="primary" />
                  <div class="text-subtitle-2 font-weight-medium">
                    {{ format.label }}
                  </div>
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  {{ format.description }}
                </div>
              </v-sheet>
            </div>
          </v-sheet>
        </v-col>
        <v-col cols="12" md="6">
          <v-sheet class="about-surface pa-4 h-100" rounded="lg" border>
            <div class="text-subtitle-1 font-weight-medium mb-3">
              Privacy and performance
            </div>
            <v-list density="compact" class="about-trust-list">
              <v-list-item
                v-for="point in aboutTrustPoints"
                :key="point"
                :title="point"
                prepend-icon="mdi-check-circle-outline"
              />
            </v-list>
          </v-sheet>
        </v-col>
      </v-row>

      <div class="about-cta-row">
        <v-btn
          v-for="link in aboutActionLinks"
          :key="link.title"
          :prepend-icon="link.icon"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          variant="tonal"
          color="primary"
          class="about-cta-btn"
        >
          {{ link.title }}
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
const aboutSteps: Array<{ number: number; title: string; description: string }> = [
  {
    number: 1,
    title: "Choose board",
    description: "Pick the board you own so output size and defaults match your target display.",
  },
  {
    number: 2,
    title: "Tune conversion",
    description: "Adjust format, FPS, quality, orientation, and trim range for your source media.",
  },
  {
    number: 3,
    title: "Export file",
    description: "Run conversion locally, preview the result, and download the final board-ready file.",
  },
];

const aboutExportFormats: Array<{ label: string; icon: string; description: string }> = [
  {
    label: "GIF",
    icon: "mdi-file-gif-box",
    description: "Loop-ready animation output.",
  },
  {
    label: "MJPEG",
    icon: "mdi-file-video-outline",
    description: "Motion JPEG stream for display playback.",
  },
  {
    label: "AVI",
    icon: "mdi-filmstrip-box-multiple",
    description: "Container export with MJPEG video.",
  },
  {
    label: "MP3",
    icon: "mdi-music-box",
    description: "Audio extraction for sound-only workflows.",
  },
];

const aboutTrustPoints = [
  "All conversion runs in your browser on your own computer.",
  "No upload pipeline is required for processing source media.",
  "Speed depends on your hardware, browser resources, and source length.",
  "Board sizing, orientation, and scale mode are applied before export.",
  "Live preview and trim controls help verify output before download.",
];

const aboutActionLinks: Array<{ title: string; icon: string; href: string }> = [
  {
    title: "Watch tutorial",
    icon: "mdi-youtube",
    href: "https://www.youtube.com/@thelastoutpostworkshop",
  },
  {
    title: "Request feature",
    icon: "mdi-source-repository",
    href: "https://github.com/thelastoutpostworkshop/video_conversion",
  },
  {
    title: "Buy me a coffee",
    icon: "mdi-coffee-outline",
    href: "https://buymeacoffee.com/thelastoutpostworkshop",
  },
];
</script>

<style scoped>
.about-root-card {
  min-height: 68vh;
  backdrop-filter: blur(6px);
  background: rgba(var(--v-theme-surface), 0.92);
}

.about-view-body {
  display: grid;
  gap: 14px;
}

.about-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  border-color: rgba(var(--v-theme-primary), 0.26) !important;
  background:
    linear-gradient(
      125deg,
      rgba(var(--v-theme-primary), 0.12) 0%,
      rgba(var(--v-theme-secondary), 0.1) 48%,
      rgba(var(--v-theme-surface), 0.36) 100%
    );
}

.about-hero-copy {
  max-width: 760px;
}

.about-hero-kicker {
  letter-spacing: 0.1em;
  color: rgba(var(--v-theme-primary), 0.95);
}

.about-hero-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.about-steps-row {
  row-gap: 12px;
}

.about-step-card {
  background: rgba(var(--v-theme-surface), 0.42);
  border-color: rgba(var(--v-theme-on-surface), 0.12) !important;
}

.about-step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-primary), 0.38);
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.about-surface {
  background: rgba(var(--v-theme-surface), 0.38);
  border-color: rgba(var(--v-theme-on-surface), 0.1) !important;
}

.about-export-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.about-export-card {
  background: rgba(var(--v-theme-surface), 0.5);
  border-color: rgba(var(--v-theme-on-surface), 0.12) !important;
}

.about-trust-list {
  background: transparent;
  padding-inline: 0;
}

.about-trust-list :deep(.v-list-item) {
  padding-inline: 0;
}

.about-trust-list :deep(.v-list-item-title) {
  white-space: normal !important;
  overflow: visible;
  text-overflow: clip;
  line-height: 1.35;
}

.about-cta-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.about-cta-btn {
  min-height: 42px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

@media (max-width: 959px) {
  .about-hero {
    flex-direction: column;
  }

  .about-cta-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .about-export-grid {
    grid-template-columns: 1fr;
  }
}
</style>
