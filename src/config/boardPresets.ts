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
  outputFormat: VideoOutputFormat;
  notes: string;
}

export const BOARD_PRESETS: BoardPreset[] = [
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
        name: "AVI Player with sound",
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
          "Turns a JC4827W543 touchscreen board into a standalone internet radio using LVGL v9 for the interface and ESP32 Audio for stream playback.  At startup, it connects to Wi-Fi, loads station data from an SD card JSON file, and lets the user browse/play stations from the touch UI.",
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
          "Turns the JC4827W543 into a standalone 2.4 GHz WiFi analyzer. It performs continuous WiFi scans and renders a live channel graph on the onboard display so you can quickly see network density, signal strength, and likely lower-noise channels for better WiFi planning",
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
    height: 272,
    orientation: "none",
    scaleMode: "fit",
    fps: 15,
    quality: 10,
    outputFormat: "mjpeg",
    notes: "Discover the all-in-one JC4827W543 ESP32-S3 development board! With 8Mb PSRAM, 4Mb FLASH Memory, RGB 65K true-to-life colours, Micro SD Card reader, capacitive or resistance touch.",
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
          "Turns the ESP32-C6-LCD-1.47 board into a standalone MJPEG media player. The firmware scans the SD card for `.mjpeg` files in `/mjpeg`, decodes them frame-by-frame, and renders video on the LCD in a continuous loop. A hardware button lets you skip to the next clip during playback.",
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
          "Turns the ESP32-C6-LCD-1.47 into a standalone crypto dashboard built with LVGL 9.  It connects to Wi-Fi, fetches live prices from Binance, and displays a compact UI with a line chart, price cards, and daily percentage movement",
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
    fps: 15,
    quality: 10,
    outputFormat: "mjpeg",
    notes: "ESP32-C6, 172×320, 262K Color, 160MHz Single-core Processor, Supports WiFi 6 & Bluetooth 5, Onboard Antenna, Micro SD card reader",
  },
  {
    id: "ESP32-S3-1.43-AMOLED",
    name: "Waveshare ESP32-S3 1.43\" AMOLED",
    imagePath: "board-catalog/esp32-s3-touch-amoled-1.43/esp32-s3-touch-amoled-1.43.png",
    roundDisplay: true,
    amazonUrl: "https://amzn.to/41VszVi",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_ondyHh3",
    projects: [
      {
        name: "X-Wing Game!",
        description:
          "X-Wing Pursuit is an arcade-style reflex game built for the Waveshare ESP32-S3 1.43\" AMOLED Touch Display. You pilot an X-Wing using the onboard IMU (tilt + twist), line up over the center target, and tap the screen to score hits before time runs out. The game includes animated intro/win/lose sequences and stores your best completion time in ESP32 NVS, so your high score survives power cycles.",
        url: "https://github.com/thelastoutpostworkshop/waveshare_esp32s3_1.43_amoled_xwing_game",
        imagePath: "board-catalog/esp32-s3-touch-amoled-1.43/xwing_still.png",
        hoverImagePath: "board-catalog/esp32-s3-touch-amoled-1.43/xwing_demo.gif",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/eDDZ7O_mwxU",
          },
        ],
      },
      {
        name: "Surface Level",
        description:
          "Ready-to-run digital surface level example using LVGL 9. It combines the onboard AMOLED screen, capacitive touch controller, and QMI8658 6-axis IMU to create a responsive level interface with a moving bubble, angle readouts, and a target indicator when the device is close to level.",
        url: "https://github.com/thelastoutpostworkshop/waveshare_esp32s3_1.43_amoled_lvgl9",
        imagePath: "board-catalog/esp32-s3-touch-amoled-1.43/surface_level_still.png",
        hoverImagePath: "board-catalog/esp32-s3-touch-amoled-1.43/surface_level_demo.gif",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/HT6sG39-vrk",
          },
        ],
      },
    ],
    width: 466,
    height: 466,
    orientation: "none",
    scaleMode: "fit",
    fps: 15,
    quality: 10,
    outputFormat: "mjpeg",
    notes: "ESP32-S3 16Mb Flash, 8Mb psram, 466×466, 16.7M Color, Acceleromete And Gyroscope Sensor, Micro SD card reader",
  },
  {
    id: "ESP32-2432S028",
    name: "2.8\" Cheap Yellow Display ESP32-2432S028",
    imagePath: "board-catalog/ESP32-2432S028/ESP32-2432S028.png",
    amazonUrl: "https://amzn.to/4kAyDJh",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_oCVWMbC",
    projects: [
      {
        name: "Video Player",
        description:
          "Turns the Cheap Yellow Display with the ILI9341 controller into a standalone SD-card video player. The sketch scans a /mjpeg folder on the SD card, loads Motion JPEG (.mjpeg) files, and plays them back full-screen on the built-in 240x320 display. It is designed for simple offline playback with minimal setup: copy converted MJPEG files to the card, power the board, and the videos play in sequence on a loop",
        url: "https://github.com/thelastoutpostworkshop/esp32-2432S028_video_player",
        imagePath: "board-catalog/ESP32-2432S028/video_still.png",
        hoverImagePath: "board-catalog/ESP32-2432S028/video_demo.gif",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/jYcxUgxz9ks",
          },
        ],
      },
    ],
    width: 240,
    height: 320,
    orientation: "none",
    scaleMode: "fit",
    fps: 15,
    quality: 10,
    outputFormat: "mjpeg",
    notes: "ESP32-2432S028R Resistive Touch Screen 240x320, RGB 65K color , Micro SD card reader",
  },
  {
    id: "GC9A01",
    name: "GC9A01 1.28\" Round Display",
    imagePath: "board-catalog/GC9A01/GC9A01.png",
    amazonUrl: "https://amzn.to/3CJjbHy",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_c3cFGvxV",
    projects: [
      {
        name: "Uncanny Eyes!",
        description:
          "Master the Round display on ESP 32 and GC9A01 driver with the TFT_eSPI library and and bring uncanny eyes to life, not just on one but two on two displays! It's time to add a whole new dimension to your electronic projects",
        url: "https://github.com/thelastoutpostworkshop/ESP32LCDRound240x240Eyes",
        imagePath: "board-catalog/GC9A01/eyes_still.png",
        hoverImagePath: "board-catalog/GC9A01/eyes_demo.gif",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/pmCc7z_Mi8I",
          },
        ],
      },
      {
        name: "Bring GIFs to Life: Animating from memory",
        description:
          "Bring your visual creativity to life with this detailed tutorial on animating GIFs using a unique round display with GC9A01 driver and ESP32. You'll find all you need here to adapt your animated GIFs for the round display, wire them with an ESP32, and code them into being. Explore two versatile ways to use animated GIFs: utilizing ESP32 memory or using a convenient SD Card method.",
        url: "https://github.com/thelastoutpostworkshop/animated_gif_memory",
        imagePath: "board-catalog/GC9A01/gif_memory_still.png",
        hoverImagePath: "board-catalog/GC9A01/gif_memory_demo.gif",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/mqSe_uMpxIs",
          },
        ],
      },
      {
        name: "Bring GIFs to Life: Animating from SD Card",
        description:
          "Bring your visual creativity to life with this detailed tutorial on animating GIFs using a unique round display with GC9A01 driver and ESP32. You'll find all you need here to adapt your animated GIFs for the round display, wire them with an ESP32, and code them into being. Explore two versatile ways to use animated GIFs: utilizing ESP32 memory or using a convenient SD Card method.",
        url: "https://github.com/thelastoutpostworkshop/animated_gif_sdcard_spiffs",
        imagePath: "board-catalog/GC9A01/gif_sdcard_still.png",
        hoverImagePath: "board-catalog/GC9A01/gif_sdcard_demo.gif",
        demos: [
          {
            label: "Tutorial",
            url: "https://youtu.be/mqSe_uMpxIs",
          },
        ],
      },

    ],
    roundDisplay: true,
    width: 240,
    height: 240,
    orientation: "none",
    scaleMode: "fit",
    fps: 15,
    quality: 10,
    outputFormat: "gif",
    notes: "1.28\" Round LCD IPS Module 240x240, 65K RGB Colors, SPI Interface",
  },
  {
    id: "ESP32-S3-LCD-3.16",
    name: "Waveshare ESP32-S3 3.16\"",
    imagePath: "board-catalog/esp32-s3-lcd-3.16-1.png",
    amazonUrl:
      "https://amzn.to/4689Mbm",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_c4S9IVQB",
    width: 320,
    height: 820,
    orientation: "none",
    scaleMode: "fit",
    fps: 15,
    quality: 7,
    outputFormat: "mjpeg",
    notes: "320x820 Pixels 262K Color, Micro SD Card reader, WiFi and Bluetooth 5.",
  },
  {
    id: "ESP32-S3-LCD-2.8",
    name: "ESP32-S3 2.8″",
    imagePath: "",
    amazonUrl:
      "https://amzn.to/4e3bzTB",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_c454m9Ch",
    width: 480,
    height: 480,
    roundDisplay: true,
    orientation: "none",
    scaleMode: "fit",
    fps: 15,
    quality: 7,
    outputFormat: "mjpeg",
    notes: "480×480, Acceleromete And Gyroscope Sensor, Micro SD card reader, Options For Touch Function",
  },
];
