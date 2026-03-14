export const isElectronRuntime = (): boolean =>
  typeof window !== "undefined" && window.electronMedia?.isElectron === true;

export const getMediaBackendLabel = (): "Electron native CLI" | "WebAssembly" =>
  isElectronRuntime() ? "Electron native CLI" : "WebAssembly";
