import type {
  VideoOrientation,
  VideoScaleMode,
} from "@/services/MediaProcessingService";

export type VideoOutputFormat = "gif" | "mjpeg" | "avi";

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
    name: "Waveshare ESP32-S3 3.16inch",
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
    notes: "ESP32-S3 3.16inch display board, 320x820 panel, WiFi and Bluetooth 5.",
  },
  {
    id: "jc4827w543",
    name: "Guiton JC4827W543",
    imagePath: "board-catalog/JC4827W543.png",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_oEHbBud",
    width: 480,
    height: 270,
    orientation: "none",
    scaleMode: "fit",
    fps: 15,
    quality: 7,
    notes: "ESP32-S3 8M PSRAM 4M FLASH 4.3-inch IPS with capacitive or resistance touch.",
  },
  {
    id: "esp32-c6-lcd-1_47",
    name: "Waveshare ESP32-C6 LCD 1.47inch",
    imagePath: "board-catalog/esp32-c6-lcd-1_47.png",
    amazonUrl: "https://amzn.to/3ZzfcZr",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_okJAvee",
    width: 172,
    height: 320,
    orientation: "none",
    scaleMode: "fit",
    fps: 20,
    quality: 6,
    notes: "ESP32-C6 1.47inch Display Development Board, 172×320, 262K Color, 160MHz Single-core Processor, Supports WiFi 6 & Bluetooth 5, Onboard Antenna, Micro SD card reader",
  },
  {
    id: "ESP32-S3-1.43-AMOLED",
    name: "Waveshare ESP32-S3 1.43inch AMOLED Round",
    imagePath: "board-catalog/esp32-s3-touch-amoled-1.43.png",
    roundDisplay: true,
    amazonUrl: "https://amzn.to/41VszVi",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_ondyHh3",
    width: 466,
    height: 466,
    orientation: "none",
    scaleMode: "fit",
    fps: 18,
    quality: 7,
    notes: "ESP32-S3 1.43inch AMOLED Display Development Board, 466×466, QSPI Interface Round Display, Accelerometer And Gyroscope Sensor Micro SD card reader",
  },
  {
    id: "m5stack-core2",
    name: "M5Stack Core2 320x240",
    imagePath: "board-catalog/m5stack-core2-320x240.svg",
    amazonUrl: "https://www.amazon.com/s?k=M5Stack+Core2",
    aliexpressUrl:
      "https://www.aliexpress.com/wholesale?SearchText=M5Stack+Core2",
    width: 320,
    height: 240,
    orientation: "none",
    scaleMode: "fit",
    fps: 20,
    quality: 6,
    notes: "Matches 320x240 LCD and common playback stacks.",
  },
  {
    id: "esp32-st7789-135x240",
    name: "ESP32 + ST7789 135x240",
    imagePath: "board-catalog/esp32-st7789-135x240.svg",
    amazonUrl: "https://www.amazon.com/s?k=ESP32+ST7789+135x240",
    aliexpressUrl:
      "https://www.aliexpress.com/wholesale?SearchText=ESP32+ST7789+135x240",
    width: 135,
    height: 240,
    orientation: "none",
    scaleMode: "fit",
    fps: 12,
    quality: 8,
    notes: "Conservative defaults for small SPI displays.",
  },
];
