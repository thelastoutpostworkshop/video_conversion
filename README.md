# Video Conversion Studio

Vue 3 + TypeScript + Vuetify app for client-side media manipulation with `ffmpeg.wasm`.

## Features

- Convert video to `gif`, `mjpeg`, and `avi`.
- Extract audio to `mp3`.
- Trim by start/end time.
- Resize, rotate, and scale video output.
- Render frame previews with ffmpeg.
- Keep all processing in the browser.

## Setup

```sh
npm install
```

## Development

```sh
npm run dev
```

## Build

```sh
npm run build
```

`npm run build` runs typecheck first (`npm run typecheck`) and then builds with Vite.

For subpath hosting such as GitHub Pages project sites, set `VITE_BASE_PATH`
before building. Example:

```sh
$env:VITE_BASE_PATH="/video_conversion/"
npm run build
```

The included GitHub Pages workflow does this automatically and deploys the
generated `dist/` output, not the repository source tree.

## Electron development

```sh
npm run electron:dev
```

This stages bundled desktop FFmpeg tools, starts the Vite dev server, and launches Electron against it.

The browser build keeps using `ffmpeg.wasm`. The Electron build uses native
`ffmpeg`, `ffprobe`, and `ffplay` binaries through IPC.

During Electron development and packaging, the build scripts copy those executables from
your current system `PATH` into `vendor/ffmpeg/<platform>-<arch>/`. The packaged desktop
app then runs those bundled tools from its own `resources/ffmpeg/` directory, so end users
do not need FFmpeg installed separately.

Electron exports are saved directly to the path you choose instead of being copied back
into the renderer as a download blob. When Electron provides a native source file path
from file input or drag-and-drop, conversion also runs directly against that path.

## Electron build

```sh
npm run electron:build
```

This first stages the bundled FFmpeg tools, runs the standard web build, and then packages
an unpacked desktop app into `dist-electron/`.
