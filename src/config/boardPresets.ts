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
  description?: string;
  url: string;
  imagePath: string;
  hoverImagePath?: string;
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
        description:
          "Community repositories and examples you can adapt for this display.",
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
    imagePath: "board-catalog/JC4827W543/JC4827W543.png",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_oEHbBud",
    projects: [
      {
        name: "Animated GIF",
        description:
          "Touch-driven animated GIF browser/player for the JC4827W543 display using an ESP32-S3, SD card storage, and optional PSRAM acceleration",
        url: "https://github.com/thelastoutpostworkshop/JC4827W543_AnimatedGIF",
        imagePath: "board-catalog/JC4827W543/animated_gif_still.png",
        hoverImagePath: "board-catalog/JC4827W543/animated_gif_demo.gif",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/mnOzfRFQJIM?t=303",
          },
        ],
      },
      {
        name: "AVI Player",
        description:
          "Plays any AVI videos with sound stored on a SD card, shows a simple file picker UI, and plays the selected video with audio",
        url: "https://github.com/thelastoutpostworkshop/JC4827W543_avi_player",
        imagePath: "board-catalog/JC4827W543/avi_still.png",
        hoverImagePath: "board-catalog/JC4827W543/avi_demo.gif",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/mnOzfRFQJIM?t=485",
          },
        ],
      },
      {
        name: "Internet Radio",
        description:
          "Listen to live radio stations of your choice using LVGL 9!",
        url: "https://github.com/thelastoutpostworkshop/JC4827W543_radio_lvgl",
        imagePath: "board-catalog/JC4827W543/radio_still.png",
        hoverImagePath: "board-catalog/JC4827W543/radio_demo.gif",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/mnOzfRFQJIM?t=858",
          },
        ],
      },
      {
        name: "Wifi Analyzer",
        description:
          "Handy Wi-Fi Analyzer app, perfect for scanning local networks.",
        url: "https://github.com/thelastoutpostworkshop/JC4827W543_WifiAnalyzer",
        imagePath: "board-catalog/JC4827W543/wifi_still.png",
        hoverImagePath: "board-catalog/JC4827W543/wifi_demo.gif",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/mnOzfRFQJIM?t=122",
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
    notes: "Discover the all-in-one JC4827W543 ESP32-S3 development board! Create a Wi-Fi analysis, display animated GIFs, play AVI videos with sound, build GUIs with LVGL 9, and stream live internet radio. ESP32-S3 8M PSRAM 4M FLASH RGB 65K true-to-life colours, Micro SD Card reader, capacitive or resistance touch.",
  },
  {
    id: "esp32-c6-lcd-1_47",
    name: "Waveshare ESP32-C6 LCD 1.47\"",
    imagePath: "board-catalog/esp32-c6-lcd-1_47/esp32-c6-lcd-1_47.png",
    amazonUrl: "https://amzn.to/3ZzfcZr",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_okJAvee",
    projects: [
      {
        name: "Video player",
        description:
          "Compact ESP32-C6 video player example tuned for this 1.47-inch LCD board.",
        url: "https://github.com/thelastoutpostworkshop/ESP32-C6-LCD-1.47_video_player",
        imagePath: "board-catalog/esp32-c6-lcd-1_47/video_still.png",
        hoverImagePath: "board-catalog/esp32-c6-lcd-1_47/video_demo.gif",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/JqQEG0eipic?t=103",
          },
        ],
      },
      {
        name: "Crypto Monitor",
        description:
          "Compact ESP32-C6 video player example tuned for this 1.47-inch LCD board.",
        url: "https://github.com/thelastoutpostworkshop/ESP32-C6-LCD-1.47_LVGL9_Crypto_Monitor",
        imagePath: "board-catalog/esp32-c6-lcd-1_47/crypto_still.png",
        hoverImagePath: "board-catalog/esp32-c6-lcd-1_47/crypto_demo.gif",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/JqQEG0eipic?t=616",
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
        description:
          "Community projects and demos for the 1.43-inch AMOLED ESP32-S3 display.",
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
        description:
          "Browse open-source examples for the ESP32-2432S028 display module.",
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
        description:
          "Starter projects and demo videos for GC9A01 round display builds.",
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
