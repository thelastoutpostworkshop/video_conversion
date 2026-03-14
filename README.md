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

## Electron development

```sh
npm run electron:dev
```

This starts the Vite dev server and launches Electron against it.

The browser build keeps using `ffmpeg.wasm`. The Electron build uses the native
`ffmpeg` and `ffprobe` CLI tools through IPC, so those executables must be available on
your system `PATH`.

Electron exports are saved directly to the path you choose instead of being copied back
into the renderer as a download blob. When Electron provides a native source file path
from file input or drag-and-drop, conversion also runs directly against that path.

## Electron build

```sh
npm run electron:build
```

This runs the standard web build first, then packages an unpacked desktop app into `dist-electron/`.
