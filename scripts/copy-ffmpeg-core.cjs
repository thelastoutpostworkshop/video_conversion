const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const sourceDirCandidates = [
  path.join(rootDir, "node_modules", "@ffmpeg", "core", "dist"),
  path.join(rootDir, "node_modules", "@ffmpeg", "core", "dist", "esm"),
  path.join(rootDir, "node_modules", "@ffmpeg", "core", "dist", "umd"),
];
const targetDir = path.join(rootDir, "public", "ffmpeg");

const requiredFiles = ["ffmpeg-core.js", "ffmpeg-core.wasm"];
const optionalFiles = ["ffmpeg-core.worker.js"];

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const resolveSourcePath = (fileName) => {
  for (const dir of sourceDirCandidates) {
    const candidate = path.join(dir, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

const copyFile = (fileName, isOptional = false) => {
  const sourcePath = resolveSourcePath(fileName);
  if (!sourcePath) {
    if (isOptional) {
      return;
    }
    throw new Error(`Missing ffmpeg core file: ${fileName}`);
  }
  const targetPath = path.join(targetDir, fileName);
  fs.copyFileSync(sourcePath, targetPath);
};

try {
  ensureDir(targetDir);
  requiredFiles.forEach((file) => copyFile(file, false));
  optionalFiles.forEach((file) => copyFile(file, true));
  console.log("[ffmpeg] Copied core assets to public/ffmpeg");
} catch (error) {
  console.error("[ffmpeg] Failed to copy core assets", error);
  console.error(
    "[ffmpeg] Make sure @ffmpeg/core is installed and try `npm run ffmpeg:assets`."
  );
  process.exitCode = 1;
}
