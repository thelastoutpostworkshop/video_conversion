import { app, BrowserWindow, dialog, shell } from "electron";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRootDir = path.resolve(__dirname, "..");
const rendererDistDir = path.join(projectRootDir, "dist");
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

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

let rendererServer = null;

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

const startRendererServer = async () => {
  await stat(path.join(rendererDistDir, "index.html"));

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    try {
      const asset = await readStaticAsset(url.pathname);
      const extension = path.extname(asset.filePath).toLowerCase();

      response.writeHead(asset.statusCode, {
        "Cache-Control": "no-cache",
        "Content-Type":
          mimeTypes[extension] ?? "application/octet-stream",
      });
      response.end(asset.body);
    } catch (error) {
      console.error("[electron] Failed to serve renderer asset", error);
      response.writeHead(500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end("Internal server error");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Failed to determine Electron renderer server address.");
  }

  rendererServer = server;
  return `http://127.0.0.1:${address.port}`;
};

const stopRendererServer = async () => {
  if (!rendererServer) {
    return;
  }

  const server = rendererServer;
  rendererServer = null;

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const createMainWindow = async () => {
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
    void shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("http://127.0.0.1:") && url !== devServerUrl) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  if (devServerUrl) {
    await window.loadURL(devServerUrl);
    window.webContents.openDevTools({ mode: "detach" });
    return window;
  }

  const rendererUrl = await startRendererServer();
  await window.loadURL(rendererUrl);
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
  void stopRendererServer();
});
