<template>
  <v-card rounded="lg" elevation="4" class="about-root-card">
    <v-card-text class="about-view-body pa-4 pa-md-6">
      <v-sheet class="about-hero pa-4 pa-md-6" rounded="xl" border>
        <div class="about-hero__header">
          <div class="about-hero__copy">
            <div class="text-overline about-section-label">
              Brought to you by The Last Outpost Workshop
            </div>
            <div class="about-hero__title">
              Board-ready media, without the guesswork.
            </div>
            <div class="text-body-1 text-medium-emphasis about-hero__description">
              Video Conversion Studio helps you take regular video or audio files and turn
              them into output that fits ESP display projects. Choose a board, trim the
              source, preview the result, and export the format your build actually needs.
            </div>
          </div>

          <div class="about-hero__badges">
            <v-chip
              size="small"
              color="info"
              variant="tonal"
              prepend-icon="mdi-tag-outline"
            >
              Version {{ appVersion }}
            </v-chip>
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
        </div>

        <div class="about-hero__stats">
          <div
            v-for="item in aboutHighlights"
            :key="item.label"
            class="about-highlight"
          >
            <div class="about-highlight__label">
              {{ item.label }}
            </div>
            <div class="about-highlight__value">
              {{ item.value }}
            </div>
          </div>
        </div>
      </v-sheet>

      <div class="about-story-grid">
        <v-sheet class="about-story-card pa-4 pa-md-5" rounded="xl" border>
          <div class="text-overline about-section-label">
            What this app does
          </div>
          <div class="about-story-card__title">
            A focused conversion tool for ESP32 boards and display projects
          </div>
          <div class="text-body-2 text-medium-emphasis about-story-card__copy">
            Use a board preset or enter a custom screen size, then tune orientation, scale
            mode, FPS, quality, trimming, and crop. The app is built to help you prepare
            media that fits the target screen before you ever copy it to the device.
          </div>
        </v-sheet>

        <v-sheet class="about-story-card about-story-card--brand pa-4 pa-md-5" rounded="xl" border>
          <div class="text-overline about-section-label">
            Why it exists
          </div>
          <div class="about-story-card__title">
            The Last Outpost Workshop made this to simplify the media-prep workflow
          </div>
          <div class="text-body-2 text-medium-emphasis about-story-card__copy">
            Instead of bouncing between editors, calculators, and command-line flags, you
            get one place to size media for boards, inspect the result, and export a file
            that is ready to test on real hardware.
          </div>
        </v-sheet>
      </div>

      <v-sheet class="about-capabilities-surface pa-4 pa-md-5" rounded="xl" border>
        <div class="about-capabilities__header">
          <div>
            <div class="text-overline about-section-label">
              What you can do here
            </div>
            <div class="about-capabilities__title">
              The full workflow is built into one screen
            </div>
          </div>
          <div class="text-body-2 text-medium-emphasis about-capabilities__intro">
            Pick the target, prepare the source, verify the output, and export locally.
          </div>
        </div>

        <div class="about-capability-grid">
          <v-sheet
            v-for="item in aboutCapabilities"
            :key="item.title"
            class="about-capability-card pa-4"
            rounded="lg"
            border
          >
            <div class="about-capability-card__icon">
              <v-icon :icon="item.icon" size="20" />
            </div>
            <div class="about-capability-card__title">
              {{ item.title }}
            </div>
            <div class="text-body-2 text-medium-emphasis">
              {{ item.description }}
            </div>
          </v-sheet>
        </div>
      </v-sheet>

      <v-sheet class="about-exports-surface pa-4 pa-md-5" rounded="xl" border>
        <div class="text-overline about-section-label">
          Export formats
        </div>
        <div class="about-exports__title">
          Built for the formats makers actually use
        </div>
        <div class="about-export-grid">
          <div
            v-for="format in aboutExportFormats"
            :key="format.label"
            class="about-export-pill"
          >
            <v-icon :icon="format.icon" size="18" color="primary" />
            <div>
              <div class="about-export-pill__label">
                {{ format.label }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ format.description }}
              </div>
            </div>
          </div>
        </div>
      </v-sheet>

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
defineProps<{
  appVersion: string;
}>();

const aboutHighlights: Array<{ label: string; value: string }> = [
  {
    label: "Targets",
    value: "Board presets and custom screen sizes",
  },
  {
    label: "Controls",
    value: "Trim, preview, crop, FPS, quality, orientation",
  },
  {
    label: "Exports",
    value: "GIF, MJPEG, AVI, and MP3",
  },
];

const aboutCapabilities: Array<{ title: string; icon: string; description: string }> = [
  {
    title: "Board-aware output",
    icon: "mdi-view-grid-plus-outline",
    description:
      "Start from known board presets or set your own target dimensions when you need a custom display.",
  },
  {
    title: "Trim and inspect",
    icon: "mdi-timeline-outline",
    description:
      "Scrub the source, define trim points, and check the timing before starting a conversion.",
  },
  {
    title: "Shape the result",
    icon: "mdi-crop",
    description:
      "Adjust scale mode, orientation, FPS, quality, and crop so the file fits the screen cleanly.",
  },
  {
    title: "Export locally",
    icon: "mdi-harddisk",
    description:
      "Process media on your own machine and save the finished output directly without an upload step.",
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
    description: "Motion JPEG playback for display projects.",
  },
  {
    label: "AVI",
    icon: "mdi-filmstrip-box-multiple",
    description: "MJPEG video inside a standard container.",
  },
  {
    label: "MP3",
    icon: "mdi-music-box",
    description: "Audio extraction from video sources.",
  },
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
  background:
    radial-gradient(circle at 12% 0%, rgba(var(--v-theme-primary), 0.1), transparent 28%),
    linear-gradient(180deg, rgba(var(--v-theme-surface), 0.96), rgba(var(--v-theme-surface), 0.9));
}

.about-view-body {
  display: grid;
  gap: 14px;
}

.about-section-label {
  letter-spacing: 0.12em;
  color: rgba(var(--v-theme-primary), 0.96);
}

.about-hero {
  display: grid;
  gap: 18px;
  border-color: rgba(var(--v-theme-primary), 0.24) !important;
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-secondary), 0.16), transparent 30%),
    radial-gradient(circle at 0% 0%, rgba(var(--v-theme-primary), 0.18), transparent 34%),
    linear-gradient(
      135deg,
      rgba(var(--v-theme-surface), 0.84) 0%,
      rgba(var(--v-theme-surface), 0.54) 100%
    );
}

.about-hero__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.about-hero__copy {
  max-width: 760px;
}

.about-hero__title {
  max-width: 12ch;
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 0.98;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: rgb(var(--v-theme-on-surface));
}

.about-hero__description {
  max-width: 760px;
  margin-top: 12px;
  line-height: 1.55;
  font-size: 1rem;
}

.about-hero__badges {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  max-width: 320px;
}

.about-hero__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.about-highlight {
  min-height: 108px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 18px;
  background: rgba(var(--v-theme-surface), 0.42);
}

.about-highlight__label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.58);
}

.about-highlight__value {
  margin-top: 12px;
  font-size: 1.06rem;
  line-height: 1.3;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.94);
}

.about-story-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
  gap: 14px;
}

.about-story-card {
  border-color: rgba(var(--v-theme-on-surface), 0.1) !important;
  background: rgba(var(--v-theme-surface), 0.38);
}

.about-story-card--brand {
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.12), transparent 34%),
    rgba(var(--v-theme-surface), 0.38);
}

.about-story-card__title {
  max-width: 18ch;
  margin-top: 10px;
  font-size: 1.5rem;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-on-surface));
}

.about-story-card__copy {
  max-width: 60ch;
  margin-top: 12px;
  line-height: 1.55;
}

.about-capabilities-surface,
.about-exports-surface {
  border-color: rgba(var(--v-theme-on-surface), 0.1) !important;
  background: rgba(var(--v-theme-surface), 0.36);
}

.about-capabilities__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.about-capabilities__title,
.about-exports__title {
  margin-top: 10px;
  font-size: 1.45rem;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-on-surface));
}

.about-capabilities__intro {
  max-width: 360px;
  line-height: 1.45;
  text-align: right;
}

.about-capability-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.about-capability-card {
  border-color: rgba(var(--v-theme-on-surface), 0.1) !important;
  background: rgba(var(--v-theme-surface), 0.48);
}

.about-capability-card__icon {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
}

.about-capability-card__title {
  margin-top: 12px;
  margin-bottom: 6px;
  font-size: 1rem;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.95);
}

.about-export-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.about-export-pill {
  min-height: 92px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: start;
  padding: 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 16px;
  background: rgba(var(--v-theme-surface), 0.46);
}

.about-export-pill__label {
  font-size: 0.95rem;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.95);
}

.about-cta-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.about-cta-btn {
  min-height: 44px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

@media (max-width: 1080px) {
  .about-hero__header,
  .about-capabilities__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .about-capabilities__intro {
    max-width: none;
    text-align: left;
  }

  .about-export-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 959px) {
  .about-story-grid,
  .about-capability-grid,
  .about-hero__stats,
  .about-cta-row {
    grid-template-columns: 1fr;
  }

  .about-hero__title {
    max-width: none;
  }
}

@media (max-width: 640px) {
  .about-export-grid {
    grid-template-columns: 1fr;
  }
}
</style>
