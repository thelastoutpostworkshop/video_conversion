[<img src="https://github.com/thelastoutpostworkshop/images/blob/main/ESP32S3_3_15_video_player-2.png">](https://youtu.be/bFq05qXqin0)
# Video Conversion Studio
<a href="https://www.buymeacoffee.com/thelastoutpostworkshop" target="_blank">
<img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee">
</a>

Video Conversion Studio helps you convert video and audio for ESP32 small displays and embedded projects directly on your own machine.

## Use It

- Web app: [Video Conversion Studio on GitHub Pages](https://thelastoutpostworkshop.github.io/video_conversion/)
- Desktop downloads: [Latest desktop release](https://github.com/thelastoutpostworkshop/video_conversion/releases/latest)

## Features

- Convert video to `MJPEG`, `AVI`, and `GIF`
- Extract audio to `MP3`
- Trim clips by start and end time
- Resize output for supported display sizes and board presets
- Rotate and scale video with fit, fill, or stretch modes
- Use custom crop with a live preview
- Generate frame previews and motion previews before converting
- Save output locally without uploading your files to a server

## Web Or Desktop?

The web app is the easiest way to try the project. [Open the GitHub Pages link](https://thelastoutpostworkshop.github.io/video_conversion/), choose your file, and convert directly in the browser.

**The desktop app is recommended for faster performance.** It uses native `ffmpeg`, `ffprobe`, and `ffplay`, so conversions and previews are usually much faster than the browser version, especially for larger files or longer clips.

## Why The Desktop App Is Better For Speed

- Native FFmpeg is faster than `ffmpeg.wasm`
- Large files are handled more reliably
- Desktop exports save directly to disk
- Desktop motion preview uses native playback tools

If you plan to use this often, use the desktop build first.

## Privacy

Your files are processed locally. The app does not upload your media to a remote conversion service.

## For Contributors

If you want to contribute, read [CONTRIBUTING.md](./CONTRIBUTING.md).

## Manual Web Deployment

GitHub Pages deployment is manual. To publish a new web version, open the repository on GitHub, go to the `Actions` tab, select `Deploy Web App to GitHub Pages`, and click `Run workflow`.
