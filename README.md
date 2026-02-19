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
