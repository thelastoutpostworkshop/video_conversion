const { execFileSync } = require("node:child_process");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");

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

const bundleFfmpegTools = async () => {
  const resolvedToolPaths = Object.fromEntries(
    toolNames.map((toolName) => [toolName, resolveExecutablePath(toolName)])
  );
  const sourceDirectories = new Set(
    Object.values(resolvedToolPaths).map((toolPath) => path.dirname(toolPath))
  );

  await fs.rm(bundlePlatformDir, { recursive: true, force: true });
  await fs.mkdir(bundlePlatformDir, { recursive: true });

  for (const toolName of toolNames) {
    const sourcePath = resolvedToolPaths[toolName];
    const destinationPath = path.join(
      bundlePlatformDir,
      `${toolName}${path.extname(sourcePath) || executableSuffix}`
    );
    await fs.copyFile(sourcePath, destinationPath);
    if (process.platform !== "win32") {
      await fs.chmod(destinationPath, 0o755);
    }
  }

  if (process.platform === "win32") {
    for (const sourceDirectory of sourceDirectories) {
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
        tools: resolvedToolPaths,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(`[bundle] Electron FFmpeg tools ready in ${bundlePlatformDir}`);
  for (const toolName of toolNames) {
    console.log(`[bundle] ${toolName}: ${resolvedToolPaths[toolName]}`);
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
