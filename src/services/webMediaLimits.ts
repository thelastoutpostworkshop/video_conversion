export const browserFfmpegSourceFileSizeLimitBytes = 2_147_483_647;

export const formatBinaryFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = unitIndex === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
};

export const getBrowserFfmpegSourceFileSizeError = (
  file: Pick<File, "name" | "size">
): string | null => {
  if (file.size <= browserFfmpegSourceFileSizeLimitBytes) {
    return null;
  }

  return `${file.name} is ${formatBinaryFileSize(file.size)}, which exceeds the web app limit of ${formatBinaryFileSize(browserFfmpegSourceFileSizeLimitBytes)} for browser-based FFmpeg. Use the desktop version for large files.`;
};
