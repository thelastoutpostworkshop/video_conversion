import type {
  VideoOrientation,
  VideoScaleMode,
} from "@/services/MediaProcessingService";

export type VideoOutputFormat = "gif" | "mjpeg" | "avi";

export interface BoardReferenceLink {
  label: string;
  url: string;
}

export interface BoardProject {
  name: string;
  url: string;
  imagePath: string;
  demos?: BoardReferenceLink[];
}

export interface TargetProfileBase {
  width: number;
  height: number;
  orientation: VideoOrientation;
  scaleMode: VideoScaleMode;
  fps: number | null;
  quality: number | null;
  outputFormat: VideoOutputFormat;
}

export interface BoardPreset {
  id: string;
  name: string;
  imagePath: string;
  roundDisplay?: boolean;
  amazonUrl?: string;
  aliexpressUrl?: string;
  projects?: BoardProject[];
  // Legacy flat link fields kept for backward compatibility with older preset JSON.
  projectLinks?: BoardReferenceLink[];
  demoVideoLinks?: BoardReferenceLink[];
  width: number;
  height: number;
  orientation: VideoOrientation;
  scaleMode: VideoScaleMode;
  fps: number | null;
  quality: number | null;
  notes: string;
}

export const BOARD_PRESETS: BoardPreset[] = [
  {
    id: "ESP32-S3-LCD-3.16",
    name: "Waveshare ESP32-S3 3.16\"",
    imagePath: "board-catalog/esp32-s3-lcd-3.16-1.png",
    amazonUrl:
      "https://amzn.to/4689Mbm",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_c4S9IVQB",
    projects: [
      {
        name: "Community projects",
        url: "https://github.com/search?q=ESP32-S3+3.16+display&type=repositories",
        imagePath: "board-catalog/esp32-s3-lcd-3.16-1.png",
        demos: [
          {
            label: "Video demos",
            url: "https://www.youtube.com/results?search_query=Waveshare+ESP32-S3+3.16+demo",
          },
        ],
      },
    ],
    width: 320,
    height: 820,
    orientation: "none",
    scaleMode: "fit",
    fps: 15,
    quality: 7,
    notes: "320x820 Pixels 262K Color, Micro SD Card reader, WiFi and Bluetooth 5.",
  },
  {
    id: "jc4827w543",
    name: "Guiton JC4827W543 4.3\" IPS",
    imagePath: "board-catalog/JC4827W543.png",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_oEHbBud",
    projects: [
      {
        name: "Animated GIF",
        url: "https://github.com/thelastoutpostworkshop/JC4827W543_AnimatedGIF",
        imagePath: "board-catalog/animation gif cinema.gif",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/mnOzfRFQJIM",
          },
        ],
      },
      {
        name: "AVI Player",
        url: "https://github.com/thelastoutpostworkshop/JC4827W543_avi_player",
        imagePath: "board-catalog/JC4827W543.png",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/mnOzfRFQJIM",
          },
        ],
      },
    ],
    width: 480,
    height: 270,
    orientation: "none",
    scaleMode: "fit",
    fps: 15,
    quality: 7,
    notes: "ESP32-S3 8M PSRAM 4M FLASH RGB 65K true-to-life colours, Micro SD Card reader, capacitive or resistance touch.",
  },
  {
    id: "esp32-c6-lcd-1_47",
    name: "Waveshare ESP32-C6 LCD 1.47\"",
    imagePath: "board-catalog/esp32-c6-lcd-1_47.png",
    amazonUrl: "https://amzn.to/3ZzfcZr",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_okJAvee",
    projects: [
      {
        name: "Video player",
        url: "https://github.com/thelastoutpostworkshop/ESP32-C6-LCD-1.47_video_player",
        imagePath: "board-catalog/esp32-c6-lcd-1_47.png",
        demos: [
          {
            label: "Demo video",
            url: "https://www.youtube.com/watch?v=JqQEG0eipic",
          },
        ],
      },
    ],
    width: 172,
    height: 320,
    orientation: "none",
    scaleMode: "fit",
    fps: 20,
    quality: 6,
    notes: "ESP32-C6, 172×320, 262K Color, 160MHz Single-core Processor, Supports WiFi 6 & Bluetooth 5, Onboard Antenna, Micro SD card reader",
  },
  {
    id: "ESP32-S3-1.43-AMOLED",
    name: "Waveshare ESP32-S3 1.43\" AMOLED",
    imagePath: "board-catalog/esp32-s3-touch-amoled-1.43.png",
    roundDisplay: true,
    amazonUrl: "https://amzn.to/41VszVi",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_ondyHh3",
    projects: [
      {
        name: "Community projects",
        url: "https://github.com/search?q=ESP32-S3+1.43+AMOLED&type=repositories",
        imagePath: "board-catalog/esp32-s3-touch-amoled-1.43.png",
        demos: [
          {
            label: "Video demos",
            url: "https://www.youtube.com/results?search_query=ESP32-S3+1.43+AMOLED+demo",
          },
        ],
      },
    ],
    width: 466,
    height: 466,
    orientation: "none",
    scaleMode: "fit",
    fps: 18,
    quality: 7,
    notes: "ESP32-S3 16Mb Flash, 8Mb psram, 466×466, 16.7M Color, AccelerometerAnd Gyroscope Sensor, Micro SD card reader",
  },
  {
    id: "ESP32-2432S028",
    name: "2.8\" Cheap Yellow Display ESP32-2432S028",
    imagePath: "board-catalog/ESP32-2432S028.png",
    amazonUrl: "https://amzn.to/4kAyDJh",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_oCVWMbC",
    projects: [
      {
        name: "Community projects",
        url: "https://github.com/search?q=ESP32-2432S028+display&type=repositories",
        imagePath: "board-catalog/ESP32-2432S028.png",
        demos: [
          {
            label: "Video demos",
            url: "https://www.youtube.com/results?search_query=ESP32-2432S028+demo",
          },
        ],
      },
    ],
    width: 320,
    height: 240,
    orientation: "none",
    scaleMode: "fit",
    fps: 20,
    quality: 6,
    notes: "ESP32-2432S028R Resistive Touch Screen 240x320, RGB 65K color , Micro SD card reader",
  },
  {
    id: "GC9A01",
    name: "GC9A01 1.28\" Round Display",
    imagePath: "board-catalog/GC9A01.png",
    amazonUrl: "https://amzn.to/3CJjbHy",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_c3cFGvxV",
    projects: [
      {
        name: "Community projects",
        url: "https://github.com/search?q=GC9A01+ESP32+project&type=repositories",
        imagePath: "board-catalog/GC9A01.png",
        demos: [
          {
            label: "Video demos",
            url: "https://www.youtube.com/results?search_query=GC9A01+ESP32+demo",
          },
        ],
      },
    ],
    roundDisplay: true,
    width: 240,
    height: 240,
    orientation: "none",
    scaleMode: "fit",
    fps: 12,
    quality: 8,
    notes: "1.28\" Round LCD IPS Module 240x240, 65K RGB Colors, SPI Interface",
  },
];
