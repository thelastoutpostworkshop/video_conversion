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
    id: "ESP32-2432S028",
    name: "Cheap Yellow Display ESP32-2432S028",
    imagePath: "board-catalog/ESP32-2432S028.png",
    amazonUrl: "https://amzn.to/4kAyDJh",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_oCVWMbC",
    width: 320,
    height: 240,
    orientation: "none",
    scaleMode: "fit",
    fps: 20,
    quality: 6,
    notes: "2.8 inch ESP32 Display ESP32-2432S028R Resistive Touch Screen 240x320 TFT LCD, Micro SD card reader",
  },
  {
    id: "GC9A01",
    name: "GC9A01 1.28inch Round Display",
    imagePath: "board-catalog/GC9A01.png",
    amazonUrl: "https://amzn.to/3CJjbHy",
    aliexpressUrl:
      "https://s.click.aliexpress.com/e/_c3cFGvxV",
    roundDisplay: true,
    width: 240,
    height: 240,
    orientation: "none",
    scaleMode: "fit",
    fps: 12,
    quality: 8,
    notes: "1.28inch Round LCD IPS Module 240x240 Resolution 65K RGB Colors SPI Interface",
  },
];
