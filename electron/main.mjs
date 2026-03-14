import { app, BrowserWindow, dialog, protocol, shell } from "electron";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRootDir = path.resolve(__dirname, "..");
const rendererDistDir = path.join(projectRootDir, "dist");
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const productionRendererOrigin = "app://video-conversion";

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

const createMainWindow = async () => {
  if (!devServerUrl) {
    await registerRendererProtocol();
  }

  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    autoHideMenuBar: true,
    backgroundColor: "#11131a",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

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
