import { ElectronMediaProcessingService } from "@/services/ElectronMediaProcessingService";
import { MediaProcessingService } from "@/services/MediaProcessingService";
import type { MediaProcessingContract } from "@/services/mediaProcessingContract";
import { isElectronRuntime } from "@/services/runtimeEnvironment";

const browserMediaProcessingService = new MediaProcessingService();
let electronMediaProcessingService: ElectronMediaProcessingService | null = null;

const getElectronMediaProcessingService = () => {
  if (!electronMediaProcessingService) {
    electronMediaProcessingService = new ElectronMediaProcessingService();
  }
  return electronMediaProcessingService;
};

const getMediaProcessingService = (): MediaProcessingContract =>
  isElectronRuntime()
    ? getElectronMediaProcessingService()
    : browserMediaProcessingService;

class RuntimeMediaProcessingService implements MediaProcessingContract {
  ensureReady(): Promise<void> {
    return getMediaProcessingService().ensureReady();
  }

  probeVideoMetadata(...args: Parameters<MediaProcessingContract["probeVideoMetadata"]>) {
    return getMediaProcessingService().probeVideoMetadata(...args);
  }

  transcodeVideoToMjpeg(
    ...args: Parameters<MediaProcessingContract["transcodeVideoToMjpeg"]>
  ) {
    return getMediaProcessingService().transcodeVideoToMjpeg(...args);
  }

  transcodeVideoToGif(...args: Parameters<MediaProcessingContract["transcodeVideoToGif"]>) {
    return getMediaProcessingService().transcodeVideoToGif(...args);
  }

  transcodeVideoToAvi(...args: Parameters<MediaProcessingContract["transcodeVideoToAvi"]>) {
    return getMediaProcessingService().transcodeVideoToAvi(...args);
  }

  renderVideoFramePreview(
    ...args: Parameters<MediaProcessingContract["renderVideoFramePreview"]>
  ) {
    return getMediaProcessingService().renderVideoFramePreview(...args);
  }

  renderVideoMotionPreview(
    ...args: Parameters<MediaProcessingContract["renderVideoMotionPreview"]>
  ) {
    return getMediaProcessingService().renderVideoMotionPreview(...args);
  }

  renderBrowserPlayableVideoProxy(
    ...args: Parameters<MediaProcessingContract["renderBrowserPlayableVideoProxy"]>
  ) {
    return getMediaProcessingService().renderBrowserPlayableVideoProxy(...args);
  }

  transcodeAudioToMp3(...args: Parameters<MediaProcessingContract["transcodeAudioToMp3"]>) {
    return getMediaProcessingService().transcodeAudioToMp3(...args);
  }

  extractAudioFromVideo(
    ...args: Parameters<MediaProcessingContract["extractAudioFromVideo"]>
  ) {
    return getMediaProcessingService().extractAudioFromVideo(...args);
  }
}

export const mediaProcessingService = new RuntimeMediaProcessingService();
