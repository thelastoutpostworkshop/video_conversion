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
  bundle: string;
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
    bundle: "Round/square TFT board package",
    width: 320,
    height: 820,
    orientation: "none",
    scaleMode: "fit",
    fps: 15,
    quality: 7,
    notes: "ESP32-S3 3.16inch Display Development Board, 320×820 Pixels, 262K Color, 32-bit LX7 Dual-core Processor, Up to 240MHz Frequency, WiFi & Bluetooth 5, ESP32 With Display",
  },
  {
    id: "esp32-st7789-240",
    name: "ESP32-S3 + ST7789 240x240",
    bundle: "Round/square TFT board package",
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
    bundle: "2.8-inch TFT board package",
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
    bundle: "Integrated ESP32-S3 display board",
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
    bundle: "Integrated ESP32 display board",
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
    bundle: "Narrow portrait TFT board package",
    width: 135,
    height: 240,
    orientation: "none",
    scaleMode: "fit",
    fps: 12,
    quality: 8,
    notes: "Conservative defaults for small SPI displays.",
  },
];
