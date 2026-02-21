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
    width: 320,
    height: 820,
    orientation: "none",
    scaleMode: "fit",
    fps: 15,
    quality: 7,
    notes: "ESP32-S3 3.16inch display board, 320x820 panel, WiFi and Bluetooth 5.",
  },
  {
    id: "esp32-st7789-240",
    name: "ESP32-S3 + ST7789 240x240",
    imagePath: "board-catalog/esp32-st7789-240x240.svg",
    width: 240,
    height: 240,
    orientation: "none",
    scaleMode: "fit",
    fps: 15,
    quality: 7,
    notes: "Balanced for SPI displays with limited RAM.",
  },
  {
    id: "esp32-ili9341-320x240",
    name: "ESP32 + ILI9341 320x240",
    imagePath: "board-catalog/esp32-ili9341-320x240.svg",
    width: 320,
    height: 240,
    orientation: "none",
    scaleMode: "fit",
    fps: 20,
    quality: 6,
    notes: "Good default for common ESP32 TFT dev boards.",
  },
  {
    id: "lilygo-t-display-s3",
    name: "LILYGO T-Display-S3 170x320",
    imagePath: "board-catalog/lilygo-t-display-s3-170x320.svg",
    width: 170,
    height: 320,
    orientation: "none",
    scaleMode: "fit",
    fps: 18,
    quality: 7,
    notes: "Portrait profile tuned for 170x320 panel.",
  },
  {
    id: "m5stack-core2",
    name: "M5Stack Core2 320x240",
    imagePath: "board-catalog/m5stack-core2-320x240.svg",
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
    width: 135,
    height: 240,
    orientation: "none",
    scaleMode: "fit",
    fps: 12,
    quality: 8,
    notes: "Conservative defaults for small SPI displays.",
  },
];
