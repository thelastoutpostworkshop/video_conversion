<script setup lang="ts">
import arduinoMakerWorkshopThumbnail from "@/assets/tool-thumbnails/arduino-maker-workshop.jpg";
import espBoardVaultThumbnail from "@/assets/tool-thumbnails/esp-board-vault.jpg";
import gpioViewerThumbnail from "@/assets/tool-thumbnails/gpio-viewer.jpg";
import partitionBuilderThumbnail from "@/assets/tool-thumbnails/partition-builder.jpg";
import videoConversionThumbnail from "@/assets/tool-thumbnails/video-conversion.jpg";

interface ToolItem {
  key: string;
  title: string;
  icon: string;
  description: string;
  thumbnailSrc: string;
  url?: string;
  actionIcon?: string;
  actionLabel?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  tutorialUrl?: string;
}

interface ToolCardItem extends ToolItem {
  primaryActionLabel: string;
  tutorialActionUrl: string | null;
}

const coffeeUrl = "https://buymeacoffee.com/thelastoutpostworkshop";

const toolItems: ToolItem[] = [
  {
    key: "esp-board-vault",
    title: "ESP Board Vault",
    icon: "mdi-database-lock-outline",
    description:
      "A local-first desktop inventory app for ESP32 makers to scan, identify, organize, and track boards with hardware details, partition maps, photos, projects, checklists, and backups.",
    thumbnailSrc: espBoardVaultThumbnail,
    sourceUrl: "https://github.com/thelastoutpostworkshop/ESPVault",
    sourceLabel: "thelastoutpostworkshop/ESPVault",
    tutorialUrl: "https://youtu.be/YwYP-eET9Oo",
  },
  {
    key: "partition-builder",
    title: "ESP32 Partition Builder",
    icon: "mdi-table-cog",
    url: "https://thelastoutpostworkshop.github.io/ESP32PartitionBuilder/",
    description:
      "Plan and create custom partition layouts for ESP32 boards with a visual builder aimed at embedded projects.",
    thumbnailSrc: partitionBuilderThumbnail,
    sourceUrl: "https://github.com/thelastoutpostworkshop/ESP32PartitionBuilder",
    sourceLabel: "thelastoutpostworkshop/ESP32PartitionBuilder",
    tutorialUrl: "https://www.youtube.com/watch?v=EuHxodrye6E",
  },
  {
    key: "video-conversion",
    title: "Video Conversion Studio",
    icon: "mdi-movie-cog-outline",
    url: "https://thelastoutpostworkshop.github.io/video_conversion/",
    description:
      "Convert video and audio files into output that fits ESP32 display projects, including board-oriented media formats.",
    thumbnailSrc: videoConversionThumbnail,
    sourceUrl: "https://github.com/thelastoutpostworkshop/video_conversion",
    sourceLabel: "thelastoutpostworkshop/video_conversion",
    tutorialUrl: "https://www.youtube.com/watch?v=bFq05qXqin0",
  },
  {
    key: "gpio-viewer",
    title: "GPIOViewer",
    icon: "mdi-chip",
    url: "https://www.youtube.com/watch?v=JJzRXcQrl3I",
    actionIcon: "mdi-youtube",
    actionLabel: "Watch tutorial",
    description:
      "Visualize GPIO pin activity in a browser to inspect pin states, confirm board behavior, and troubleshoot wiring or signal activity.",
    thumbnailSrc: gpioViewerThumbnail,
    sourceUrl: "https://github.com/thelastoutpostworkshop/gpio_viewer",
    sourceLabel: "thelastoutpostworkshop/gpio_viewer",
  },
  {
    key: "arduino-maker-workshop",
    title: "Arduino Maker Workshop",
    icon: "mdi-microsoft-visual-studio-code",
    url: "https://marketplace.visualstudio.com/items?itemName=TheLastOutpostWorkshop.arduino-maker-workshop",
    description:
      "A VS Code extension for Arduino-centered maker development with a focused workflow for sketch-driven projects and board-oriented iteration.",
    thumbnailSrc: arduinoMakerWorkshopThumbnail,
    sourceLabel: "VS Code Marketplace extension",
    tutorialUrl: "https://www.youtube.com/watch?v=rduTUUVkzqM",
  },
];

const toolCards: ToolCardItem[] = toolItems.map((tool) => ({
  ...tool,
  primaryActionLabel: tool.actionLabel ?? "Open tool",
  tutorialActionUrl: getTutorialActionUrl(tool),
}));

function getTutorialActionUrl(tool: ToolItem): string | null {
  if (tool.tutorialUrl) {
    return tool.tutorialUrl;
  }

  return getYoutubeVideoId(tool.url) ? tool.url ?? null : null;
}

function getYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return normalizeYoutubeVideoId(parsedUrl.pathname.split("/").filter(Boolean)[0]);
    }

    if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
      if (parsedUrl.pathname === "/watch") {
        return normalizeYoutubeVideoId(parsedUrl.searchParams.get("v"));
      }

      const pathMatch = parsedUrl.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
      return normalizeYoutubeVideoId(pathMatch?.[1]);
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeYoutubeVideoId(value: string | null | undefined): string | null {
  const videoId = value?.trim();
  return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
}
</script>

<template>
  <section class="maker-tools">
    <header class="maker-tools__header">
      <div>
        <div class="maker-tools__eyebrow">Resources</div>
        <h2 class="maker-tools__title">Maker Tools</h2>
        <p class="maker-tools__subtitle">
          Maker utilities from The Last Outpost Workshop for ESP32 and embedded projects.
        </p>
      </div>
    </header>

    <div class="maker-tools__support">
      <div class="maker-tools__support-icon" aria-hidden="true">
        <v-icon icon="mdi-coffee-outline" size="28" />
      </div>
      <div class="maker-tools__support-copy">
        <div class="maker-tools__support-title">Support the project</div>
        <p>
          These maker utilities and Video Conversion Studio are free to use. If they help at
          your bench, a coffee supports ongoing development.
        </p>
      </div>
      <v-btn
        class="maker-tools__support-button"
        prepend-icon="mdi-coffee-outline"
        :href="coffeeUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        Buy Me a Coffee
      </v-btn>
    </div>

    <div class="maker-tools__grid">
      <article
        v-for="(tool, index) in toolCards"
        :key="tool.key"
        class="maker-tools__card"
      >
        <div class="maker-tools__card-body">
          <div class="maker-tools__media">
            <a
              v-if="tool.tutorialActionUrl"
              class="maker-tools__thumbnail"
              :href="tool.tutorialActionUrl"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`Watch ${tool.title} tutorial`"
              :style="{ '--maker-tools-thumbnail-delay': `${index * 70}ms` }"
            >
              <img
                :src="tool.thumbnailSrc"
                :alt="`${tool.title} tutorial thumbnail`"
                loading="lazy"
              />
              <span class="maker-tools__thumbnail-icon" aria-hidden="true">
                <v-icon :icon="tool.icon" size="18" />
              </span>
              <span class="maker-tools__play-badge" aria-hidden="true">
                <v-icon icon="mdi-play" size="24" />
              </span>
            </a>
            <div v-else class="maker-tools__icon" aria-hidden="true">
              <v-icon :icon="tool.icon" size="28" />
            </div>
          </div>

          <div class="maker-tools__copy">
            <h3>{{ tool.title }}</h3>
            <p>{{ tool.description }}</p>
            <a
              v-if="tool.sourceUrl && tool.sourceLabel"
              class="maker-tools__source"
              :href="tool.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ tool.sourceLabel }}
            </a>
            <div v-else-if="tool.sourceLabel" class="maker-tools__source-label">
              {{ tool.sourceLabel }}
            </div>
          </div>
        </div>

        <v-divider />

        <div class="maker-tools__actions">
          <v-btn
            v-if="tool.tutorialUrl"
            color="primary"
            class="maker-tools__action-btn"
            prepend-icon="mdi-youtube"
            variant="text"
            :href="tool.tutorialUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch tutorial
          </v-btn>
          <v-spacer />
          <v-btn
            v-if="tool.url"
            class="maker-tools__action-btn"
            variant="text"
            :prepend-icon="tool.actionIcon ?? 'mdi-open-in-new'"
            :href="tool.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ tool.primaryActionLabel }}
          </v-btn>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.maker-tools {
  --maker-tools-accent: rgb(var(--v-theme-primary));
  --maker-tools-accent-soft: rgba(var(--v-theme-primary), 0.12);
  --maker-tools-line: rgba(var(--v-theme-on-surface), 0.12);

  display: grid;
  gap: 16px;
  padding: 14px;
}

.maker-tools__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.maker-tools__eyebrow {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.maker-tools__title {
  margin: 4px 0 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.2;
}

.maker-tools__subtitle {
  max-width: 720px;
  margin: 8px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
  line-height: 1.55;
}

.maker-tools__support {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  padding: 16px;
  background:
    linear-gradient(90deg, rgba(var(--v-theme-primary), 0.08), transparent 70%),
    rgba(var(--v-theme-surface), 0.74);
}

.maker-tools__support-icon,
.maker-tools__icon {
  display: grid;
  place-items: center;
  border: 1px solid rgba(var(--v-theme-primary), 0.28);
  background: var(--maker-tools-accent-soft);
  color: var(--maker-tools-accent);
}

.maker-tools__support-icon {
  width: 52px;
  height: 52px;
}

.maker-tools__support-title {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 800;
}

.maker-tools__support-copy {
  min-width: 0;
}

.maker-tools__support-copy p {
  margin: 6px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
  line-height: 1.5;
}

.maker-tools__support-button {
  font-weight: 800;
}

.maker-tools__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.maker-tools__card {
  position: relative;
  display: flex;
  min-height: 224px;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--maker-tools-line);
  background:
    linear-gradient(120deg, rgba(var(--v-theme-primary), 0.06), transparent 42%),
    rgba(var(--v-theme-surface), 0.78);
  box-shadow: inset 0 1px 0 rgba(var(--v-theme-on-surface), 0.04);
}

.maker-tools__card-body {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: minmax(150px, 190px) minmax(0, 1fr);
  align-items: start;
  gap: 18px;
  padding: 16px;
}

.maker-tools__media {
  min-width: 0;
}

.maker-tools__thumbnail {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-primary), 0.22);
  background: rgba(var(--v-theme-surface-variant), 0.38);
  color: #ffffff;
  opacity: 0;
  transform: translateY(8px) scale(0.985);
  animation: maker-tools-thumbnail-enter 460ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: var(--maker-tools-thumbnail-delay, 0ms);
}

.maker-tools__thumbnail img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition:
    filter 180ms ease,
    transform 180ms ease;
}

.maker-tools__thumbnail::after {
  position: absolute;
  inset: 0;
  content: "";
  background:
    linear-gradient(180deg, rgba(5, 20, 18, 0.08), rgba(5, 20, 18, 0.34)),
    linear-gradient(90deg, rgba(var(--v-theme-primary), 0.26), transparent 44%);
}

.maker-tools__thumbnail:hover img {
  filter: saturate(1.08) contrast(1.03);
  transform: scale(1.025);
}

.maker-tools__thumbnail:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}

.maker-tools__thumbnail-icon,
.maker-tools__play-badge {
  position: absolute;
  z-index: 1;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow: 0 10px 24px rgba(3, 13, 10, 0.22);
}

.maker-tools__thumbnail-icon {
  top: 8px;
  left: 8px;
  width: 30px;
  height: 30px;
  background: rgba(5, 20, 18, 0.62);
}

.maker-tools__play-badge {
  top: 50%;
  left: 50%;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.92);
  color: rgb(var(--v-theme-on-primary));
  transform: translate(-50%, -50%);
}

.maker-tools__icon {
  width: 52px;
  height: 52px;
}

.maker-tools__copy {
  min-width: 0;
}

.maker-tools__copy h3 {
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.3;
}

.maker-tools__copy p {
  margin: 8px 0 12px;
  color: rgba(var(--v-theme-on-surface), 0.72);
  line-height: 1.5;
}

.maker-tools__source,
.maker-tools__source-label {
  color: var(--maker-tools-accent);
  font-size: 0.86rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.maker-tools__source:hover {
  text-decoration: underline;
}

.maker-tools__card :deep(.v-divider) {
  border-color: var(--maker-tools-line);
  opacity: 1;
}

.maker-tools__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(var(--v-theme-on-surface), 0.035);
}

.maker-tools__action-btn {
  font-weight: 800;
}

.maker-tools__actions :deep(.v-btn) {
  min-width: 0;
}

.maker-tools__actions :deep(.v-btn__content) {
  white-space: normal;
}

@keyframes maker-tools-thumbnail-enter {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .maker-tools__thumbnail {
    opacity: 1;
    transform: none;
    animation: none;
  }
}

@media (max-width: 1180px) {
  .maker-tools__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .maker-tools {
    padding: 8px;
  }

  .maker-tools__support,
  .maker-tools__card-body {
    grid-template-columns: 1fr;
  }

  .maker-tools__actions {
    flex-wrap: wrap;
  }

  .maker-tools__thumbnail {
    max-width: 420px;
  }
}
</style>
