# Contributing

Thanks for contributing to Video Conversion Studio.

## Before You Start

- Use Node.js 22 if possible
- Install dependencies with `npm install` or `npm ci`
- Electron development and packaging will reuse native `ffmpeg`, `ffprobe`, and `ffplay` from `PATH` when available, or download local copies automatically on first run if they are missing

## Development Setup

Run the web app:

```sh
npm run dev
```

Run the desktop app in development:

```sh
npm run electron:dev
```

## Build And Verification

Run this before opening a pull request:

```sh
npm run build
```

`npm run build` runs typecheck first, so this is the minimum validation step for changes in this repo.

If you are changing Electron packaging or desktop runtime behavior, also test:

```sh
npm run electron:build
```

## Contribution Guidelines

- Keep changes focused
- Prefer small pull requests
- Update docs when behavior changes
- Do not commit generated release artifacts unless they are explicitly needed

## Pull Requests

- Branch from `main`
- Describe the user-facing change clearly
- Include manual test notes when relevant
- Mention platform-specific testing for Electron changes

## GitHub Pages

The web app is deployed with GitHub Actions from the built `dist/` output, not from the repository source tree. If you change deployment behavior, verify the Pages workflow still builds with the correct `VITE_BASE_PATH`.
