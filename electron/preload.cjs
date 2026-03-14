const { contextBridge, ipcRenderer } = require("electron");

const mediaCheckAvailabilityChannel = "media:check-availability";
const mediaRunJobChannel = "media:run-job";
const mediaCancelJobChannel = "media:cancel-job";
const mediaJobEventChannel = "media:job-event";
const mediaPickSourceFileChannel = "media:pick-source-file";
const mediaPickSavePathChannel = "media:pick-save-path";
const mediaRevealPathChannel = "media:reveal-path";

const subscriptions = new Map();

const pickSubscriptionId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const subscribeToJobEvents = (callback) => {
  const subscriptionId = pickSubscriptionId();
  const listener = (_event, payload) => {
    callback(payload);
  };
  subscriptions.set(subscriptionId, listener);
  ipcRenderer.on(mediaJobEventChannel, listener);
  return subscriptionId;
};

const unsubscribeFromJobEvents = (subscriptionId) => {
  const listener = subscriptions.get(subscriptionId);
  if (!listener) {
    return;
  }
  ipcRenderer.removeListener(mediaJobEventChannel, listener);
  subscriptions.delete(subscriptionId);
};

contextBridge.exposeInMainWorld("electronMedia", {
  isElectron: true,
  checkAvailability: () => ipcRenderer.invoke(mediaCheckAvailabilityChannel),
  runJob: (request) => ipcRenderer.invoke(mediaRunJobChannel, request),
  cancelJob: (jobId) => ipcRenderer.invoke(mediaCancelJobChannel, { jobId }),
  pickSourceFile: () => ipcRenderer.invoke(mediaPickSourceFileChannel),
  pickSavePath: (request) => ipcRenderer.invoke(mediaPickSavePathChannel, request),
  revealPath: (targetPath) =>
    ipcRenderer.invoke(mediaRevealPathChannel, { path: targetPath }),
  subscribeToJobEvents,
  unsubscribeFromJobEvents,
});
