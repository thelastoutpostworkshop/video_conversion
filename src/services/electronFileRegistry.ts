const electronFilePathRegistry = new WeakMap<File, string>();

export const registerElectronFilePath = (file: File, filePath: string) => {
  if (!filePath.trim()) {
    return;
  }
  electronFilePathRegistry.set(file, filePath);
};

export const getElectronFilePath = (file: File): string | null => {
  const registeredPath = electronFilePathRegistry.get(file);
  if (registeredPath) {
    return registeredPath;
  }
  const maybePath = (file as File & { path?: unknown }).path;
  if (typeof maybePath === "string" && maybePath.trim().length > 0) {
    return maybePath;
  }
  const bridgedPath =
    typeof window !== "undefined" && window.electronMedia?.isElectron
      ? window.electronMedia.getPathForFile(file)
      : null;
  return typeof bridgedPath === "string" && bridgedPath.trim().length > 0
    ? bridgedPath
    : null;
};
