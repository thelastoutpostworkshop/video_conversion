const { execFileSync } = require("node:child_process");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const { Readable } = require("node:stream");
const extractZip = require("extract-zip");

const projectRootDir = path.resolve(__dirname, "..");
const bundlePlatformDir = path.join(
  projectRootDir,
  "vendor",
  "ffmpeg",
  `${process.platform}-${process.arch}`
);
const toolNames = ["ffmpeg", "ffprobe", "ffplay"];
const executableSuffix = process.platform === "win32" ? ".exe" : "";
const pathResolverCommand = process.platform === "win32" ? "where.exe" : "which";
const platformKey = `${process.platform}-${process.arch}`;
const forceDownload = process.env.VIDEO_CONVERSION_FFMPEG_FORCE_DOWNLOAD === "1";

const downloadSourcesByPlatform = {
  "win32-x64": {
    type: "archive",
    description: "Gyan.dev Windows release essentials ZIP",
    url: "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip",
  },
  "linux-x64": {
    type: "per-tool",
    description: "Martin Riedl Linux amd64 release ZIPs",
    tools: {
      ffmpeg: "https://ffmpeg.martin-riedl.de/redirect/latest/linux/amd64/release/ffmpeg.zip",
      ffprobe: "https://ffmpeg.martin-riedl.de/redirect/latest/linux/amd64/release/ffprobe.zip",
      ffplay: "https://ffmpeg.martin-riedl.de/redirect/latest/linux/amd64/release/ffplay.zip",
    },
  },
  "linux-arm64": {
    type: "per-tool",
    description: "Martin Riedl Linux arm64 release ZIPs",
    tools: {
      ffmpeg: "https://ffmpeg.martin-riedl.de/redirect/latest/linux/arm64/release/ffmpeg.zip",
      ffprobe: "https://ffmpeg.martin-riedl.de/redirect/latest/linux/arm64/release/ffprobe.zip",
      ffplay: "https://ffmpeg.martin-riedl.de/redirect/latest/linux/arm64/release/ffplay.zip",
    },
  },
  "darwin-x64": {
    type: "per-tool",
    description: "evermeet macOS Intel release ZIPs",
    tools: {
      ffmpeg: "https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip",
      ffprobe: "https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip",
      ffplay: "https://evermeet.cx/ffmpeg/getrelease/ffplay/zip",
    },
  },
  "darwin-arm64": {
    type: "per-tool",
    description: "Martin Riedl macOS arm64 release ZIPs",
    tools: {
      ffmpeg: "https://ffmpeg.martin-riedl.de/redirect/latest/macos/arm64/release/ffmpeg.zip",
      ffprobe: "https://ffmpeg.martin-riedl.de/redirect/latest/macos/arm64/release/ffprobe.zip",
      ffplay: "https://ffmpeg.martin-riedl.de/redirect/latest/macos/arm64/release/ffplay.zip",
    },
  },
};

const resolveChocolateyShimTarget = (toolName, candidatePath) => {
  if (process.platform !== "win32") {
    return null;
  }

  const normalizedCandidatePath = path.normalize(candidatePath);
  const lowerCandidatePath = normalizedCandidatePath.toLowerCase();
  const chocolateyRoot =
    process.env.ChocolateyInstall && process.env.ChocolateyInstall.trim()
      ? path.normalize(process.env.ChocolateyInstall)
      : "C:\\ProgramData\\Chocolatey";
  const chocolateyBinDir = path.join(chocolateyRoot, "bin").toLowerCase();

  if (!lowerCandidatePath.startsWith(chocolateyBinDir)) {
    return null;
  }

  const packagedToolPath = path.join(
    chocolateyRoot,
    "lib",
    "ffmpeg",
    "tools",
    "ffmpeg",
    "bin",
    `${toolName}${executableSuffix}`
  );
  return fsSync.existsSync(packagedToolPath) ? packagedToolPath : null;
};

const resolveRealExecutablePath = (toolName, candidatePath) => {
  const chocolateyToolPath = resolveChocolateyShimTarget(toolName, candidatePath);
  if (chocolateyToolPath) {
    return chocolateyToolPath;
  }

  try {
    return fsSync.realpathSync.native(candidatePath);
  } catch {
    return candidatePath;
  }
};

const resolveExecutablePath = (toolName) => {
  let output = "";
  try {
    output = execFileSync(pathResolverCommand, [toolName], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const details =
      error instanceof Error && typeof error.message === "string" && error.message.trim()
        ? error.message
        : "Command lookup failed.";
    throw new Error(`Unable to find ${toolName}${executableSuffix} on PATH. ${details}`);
  }

  const matches = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const resolvedMatches = matches.map((candidatePath) =>
    resolveRealExecutablePath(toolName, candidatePath)
  );
  const resolvedPath = resolvedMatches[0];
  if (!resolvedPath) {
    throw new Error(`Unable to find ${toolName}${executableSuffix} on PATH.`);
  }
  return resolvedPath;
};

const findFilesRecursively = async (rootDir, predicate) => {
  const pendingDirectories = [rootDir];
  const matches = [];

  while (pendingDirectories.length > 0) {
    const currentDir = pendingDirectories.pop();
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        pendingDirectories.push(entryPath);
        continue;
      }
      if (entry.isFile() && predicate(entry.name, entryPath)) {
        matches.push(entryPath);
      }
    }
  }

  return matches;
};

const findToolPathsInDirectory = async (rootDir) => {
  const toolPaths = {};
  for (const toolName of toolNames) {
    const expectedFileName = `${toolName}${executableSuffix}`;
    const matches = await findFilesRecursively(
      rootDir,
      (entryName) => entryName.toLowerCase() === expectedFileName.toLowerCase()
    );
    if (matches[0]) {
      toolPaths[toolName] = matches[0];
    }
  }
  return toolPaths;
};

const validateToolPaths = (toolPaths, contextDescription) => {
  const missingTools = toolNames.filter((toolName) => !toolPaths[toolName]);
  if (missingTools.length > 0) {
    throw new Error(
      `${contextDescription} did not provide required tools: ${missingTools.join(", ")}.`
    );
  }
};

const downloadFile = async (url, targetPath) => {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "video-conversion-studio/ffmpeg-bootstrap",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Download failed for ${url} (${response.status} ${response.statusText}).`);
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), fsSync.createWriteStream(targetPath));
};

const extractZipArchive = async (archivePath, targetDir) => {
  await fs.mkdir(targetDir, { recursive: true });
  await extractZip(archivePath, { dir: targetDir });
};

const collectWindowsDllPaths = async (rootDir) => {
  if (process.platform !== "win32") {
    return [];
  }
  return findFilesRecursively(rootDir, (entryName) => entryName.toLowerCase().endsWith(".dll"));
};

const getExistingBundledToolPaths = () => {
  const toolPaths = Object.fromEntries(
    toolNames.map((toolName) => [toolName, path.join(bundlePlatformDir, `${toolName}${executableSuffix}`)])
  );
  const hasAllTools = toolNames.every((toolName) => fsSync.existsSync(toolPaths[toolName]));
  return hasAllTools ? toolPaths : null;
};

const prepareDownloadedToolSet = async () => {
  const downloadSource = downloadSourcesByPlatform[platformKey];
  if (!downloadSource) {
    throw new Error(`Automatic FFmpeg bootstrap is not configured for ${platformKey}.`);
  }

  const tempRootDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "video-conversion-studio-ffmpeg-")
  );

  if (downloadSource.type === "archive") {
    const archivePath = path.join(tempRootDir, "ffmpeg-tools.zip");
    const extractDir = path.join(tempRootDir, "archive");
    await downloadFile(downloadSource.url, archivePath);
    await extractZipArchive(archivePath, extractDir);

    const toolPaths = await findToolPathsInDirectory(extractDir);
    validateToolPaths(toolPaths, downloadSource.description);

    return {
      tempRootDir,
      sourceType: "download",
      sourceDetails: {
        platform: platformKey,
        description: downloadSource.description,
        url: downloadSource.url,
      },
      toolPaths,
      extraFiles: await collectWindowsDllPaths(extractDir),
    };
  }

  if (downloadSource.type === "per-tool") {
    const toolPaths = {};

    for (const toolName of toolNames) {
      const archivePath = path.join(tempRootDir, `${toolName}.zip`);
      const extractDir = path.join(tempRootDir, toolName);
      await downloadFile(downloadSource.tools[toolName], archivePath);
      await extractZipArchive(archivePath, extractDir);

      const discoveredToolPaths = await findToolPathsInDirectory(extractDir);
      const discoveredToolPath = discoveredToolPaths[toolName];
      if (!discoveredToolPath) {
        throw new Error(
          `${downloadSource.description} did not provide ${toolName}${executableSuffix}.`
        );
      }
      toolPaths[toolName] = discoveredToolPath;
    }

    return {
      tempRootDir,
      sourceType: "download",
      sourceDetails: {
        platform: platformKey,
        description: downloadSource.description,
        urls: downloadSource.tools,
      },
      toolPaths,
      extraFiles: [],
    };
  }

  throw new Error(`Unsupported download source type: ${downloadSource.type}`);
};

const bundleToolSet = async ({ sourceType, sourceDetails, toolPaths, extraFiles }) => {
  const toolSourceDirectories = new Set(
    Object.values(toolPaths).map((toolPath) => path.dirname(toolPath))
  );
  const bundledToolPaths = {};

  await fs.rm(bundlePlatformDir, { recursive: true, force: true });
  await fs.mkdir(bundlePlatformDir, { recursive: true });

  for (const toolName of toolNames) {
    const sourcePath = toolPaths[toolName];
    const destinationPath = path.join(
      bundlePlatformDir,
      `${toolName}${path.extname(sourcePath) || executableSuffix}`
    );
    await fs.copyFile(sourcePath, destinationPath);
    bundledToolPaths[toolName] = destinationPath;
    if (process.platform !== "win32") {
      await fs.chmod(destinationPath, 0o755);
    }
  }

  for (const extraFilePath of extraFiles) {
    await fs.copyFile(extraFilePath, path.join(bundlePlatformDir, path.basename(extraFilePath)));
  }

  if (process.platform === "win32" && extraFiles.length === 0) {
    for (const sourceDirectory of toolSourceDirectories) {
      const siblingEntries = await fs.readdir(sourceDirectory, {
        withFileTypes: true,
      });
      for (const entry of siblingEntries) {
        if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".dll") {
          continue;
        }
        await fs.copyFile(
          path.join(sourceDirectory, entry.name),
          path.join(bundlePlatformDir, entry.name)
        );
      }
    }
  }

  const manifestPath = path.join(bundlePlatformDir, "manifest.json");
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        platform: process.platform,
        arch: process.arch,
        bundledAt: new Date().toISOString(),
        sourceType,
        source: sourceDetails,
        bundledTools: bundledToolPaths,
        sourceTools: toolPaths,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(`[bundle] Electron FFmpeg tools ready in ${bundlePlatformDir}`);
  console.log(`[bundle] source: ${sourceType}`);
  for (const toolName of toolNames) {
    console.log(`[bundle] ${toolName}: ${toolPaths[toolName]}`);
  }
};

const bundleFfmpegTools = async () => {
  if (!forceDownload) {
    try {
      const resolvedToolPaths = Object.fromEntries(
        toolNames.map((toolName) => [toolName, resolveExecutablePath(toolName)])
      );
      await bundleToolSet({
        sourceType: "path",
        sourceDetails: {
          platform: platformKey,
          description: "System PATH",
        },
        toolPaths: resolvedToolPaths,
        extraFiles: [],
      });
      return;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`[bundle] Native FFmpeg tools were not found on PATH. ${reason}`);
    }
  }

  if (!forceDownload) {
    const existingBundledToolPaths = getExistingBundledToolPaths();
    if (existingBundledToolPaths) {
      console.log(`[bundle] Reusing existing bundled FFmpeg tools from ${bundlePlatformDir}`);
      return;
    }
  }

  console.log(`[bundle] Downloading FFmpeg tools for ${platformKey}...`);
  const downloadedToolSet = await prepareDownloadedToolSet();
  try {
    await bundleToolSet(downloadedToolSet);
  } finally {
    await fs.rm(downloadedToolSet.tempRootDir, { recursive: true, force: true });
  }
};

bundleFfmpegTools().catch((error) => {
  console.error(
    `[bundle] Failed to prepare bundled FFmpeg tools: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exitCode = 1;
});
