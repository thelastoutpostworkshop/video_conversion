import { app, BrowserWindow, dialog, protocol, shell } from "electron";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerMediaIpcHandlers } from "./mediaIpc.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRootDir = path.resolve(__dirname, "..");
const rendererDistDir = path.join(projectRootDir, "dist");
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const productionRendererOrigin = "app://video-conversion";
const preloadPath = path.join(__dirname, "preload.cjs");
const windowStatePath = path.join(app.getPath("userData"), "window-state.json");
const defaultWindowWidth = 1440;
const defaultWindowHeight = 960;
const minWindowWidth = 1100;
const minWindowHeight = 760;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

const isSafeChildPath = (rootDir, candidatePath) => {
  const relativePath = path.relative(rootDir, candidatePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
};

const readStaticAsset = async (requestPath) => {
  const normalizedRequestPath =
    requestPath === "/" ? "/index.html" : decodeURIComponent(requestPath);
  const relativePath = normalizedRequestPath.replace(/^\/+/, "");
  const absolutePath = path.join(rendererDistDir, relativePath);

  if (!isSafeChildPath(rendererDistDir, absolutePath)) {
    return { statusCode: 403, body: Buffer.from("Forbidden"), filePath: absolutePath };
  }

  try {
    const assetStats = await stat(absolutePath);
    const filePath = assetStats.isDirectory()
      ? path.join(absolutePath, "index.html")
      : absolutePath;
    return {
      statusCode: 200,
      body: await readFile(filePath),
      filePath,
    };
  } catch (error) {
    const hasExplicitExtension = path.extname(relativePath) !== "";
    if (hasExplicitExtension) {
      return {
        statusCode: 404,
        body: Buffer.from("Not found"),
        filePath: absolutePath,
      };
    }
    const fallbackPath = path.join(rendererDistDir, "index.html");
    return {
      statusCode: 200,
      body: await readFile(fallbackPath),
      filePath: fallbackPath,
    };
  }
};

const registerRendererProtocol = async () => {
  await stat(path.join(rendererDistDir, "index.html"));

  if (protocol.isProtocolHandled("app")) {
    return;
  }

  protocol.handle("app", async (request) => {
    try {
      const url = new URL(request.url);
      const asset = await readStaticAsset(url.pathname);
      const extension = path.extname(asset.filePath).toLowerCase();

      return new Response(asset.body, {
        status: asset.statusCode,
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type":
            mimeTypes[extension] ?? "application/octet-stream",
        },
      });
    } catch (error) {
      console.error("[electron] Failed to serve renderer asset", error);
      return new Response("Internal server error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }
  });
};

const isInternalNavigationUrl = (url) => {
  if (devServerUrl && url === devServerUrl) {
    return true;
  }
  if (url === `${productionRendererOrigin}/` || url.startsWith(`${productionRendererOrigin}/`)) {
    return true;
  }
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.origin === productionRendererOrigin;
  } catch {
    return false;
  }
};

const ensureNavigationAllowed = async (url) => {
  if (isInternalNavigationUrl(url)) {
    return;
  }
  try {
    await shell.openExternal(url);
  } catch (error) {
    console.error("[electron] Failed to open external URL", url, error);
  }
};

const loadWindowState = async () => {
  try {
    const raw = await readFile(windowStatePath, "utf-8");
    const parsed = JSON.parse(raw);
    const width =
      typeof parsed.width === "number" && Number.isFinite(parsed.width)
        ? Math.max(minWindowWidth, Math.round(parsed.width))
        : defaultWindowWidth;
    const height =
      typeof parsed.height === "number" && Number.isFinite(parsed.height)
        ? Math.max(minWindowHeight, Math.round(parsed.height))
        : defaultWindowHeight;
    return {
      width,
      height,
      isMaximized: parsed.isMaximized === true,
    };
  } catch {
    return {
      width: defaultWindowWidth,
      height: defaultWindowHeight,
      isMaximized: false,
    };
  }
};

const persistWindowState = async (window) => {
  if (window.isDestroyed()) {
    return;
  }
  const bounds = window.isMaximized() ? window.getNormalBounds() : window.getBounds();
  const payload = {
    width: Math.max(minWindowWidth, Math.round(bounds.width)),
    height: Math.max(minWindowHeight, Math.round(bounds.height)),
    isMaximized: window.isMaximized(),
  };
  try {
    await writeFile(windowStatePath, JSON.stringify(payload, null, 2), "utf-8");
  } catch (error) {
    console.error("[electron] Failed to persist window state", error);
  }
};

const createMainWindow = async () => {
  if (!devServerUrl) {
    await registerRendererProtocol();
  }

  const windowState = await loadWindowState();
  const window = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    minWidth: minWindowWidth,
    minHeight: minWindowHeight,
    autoHideMenuBar: true,
    backgroundColor: "#11131a",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
      sandbox: true,
    },
  });

  let persistWindowStateTimer = null;
  const schedulePersistWindowState = () => {
    if (persistWindowStateTimer) {
      clearTimeout(persistWindowStateTimer);
    }
    persistWindowStateTimer = setTimeout(() => {
      persistWindowStateTimer = null;
      void persistWindowState(window);
    }, 200);
  };

  window.on("resize", schedulePersistWindowState);
  window.on("maximize", schedulePersistWindowState);
  window.on("unmaximize", schedulePersistWindowState);
  window.on("close", () => {
    if (persistWindowStateTimer) {
      clearTimeout(persistWindowStateTimer);
      persistWindowStateTimer = null;
    }
    void persistWindowState(window);
  });

  if (windowState.isMaximized) {
    window.maximize();
  }

  window.webContents.setWindowOpenHandler(({ url }) => {
    void ensureNavigationAllowed(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (isInternalNavigationUrl(url)) {
      return;
    }
    event.preventDefault();
    void ensureNavigationAllowed(url);
  });

  if (devServerUrl) {
    await window.loadURL(devServerUrl);
    window.webContents.openDevTools({ mode: "detach" });
    return window;
  }

  await window.loadURL(`${productionRendererOrigin}/index.html`);
  return window;
};

app.whenReady().then(async () => {
  registerMediaIpcHandlers();
  try {
    await createMainWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox(
      "Electron startup failed",
      `Video Conversion Studio could not start.\n\n${message}`
    );
    app.quit();
    return;
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (protocol.isProtocolHandled("app")) {
    protocol.unhandle("app");
  }
});
