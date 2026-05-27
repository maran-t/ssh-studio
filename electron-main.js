const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, shell, dialog, ipcMain } = require("electron");
const { startServer, stopServer } = require("./server");

let mainWindow = null;
let isQuitting = false;
const serverToken = crypto.randomBytes(32).toString("hex");

function log(message, error) {
  try {
    const line = `[${new Date().toISOString()}] ${message}${error ? `\n${error.stack || error.message || error}` : ""}\n`;
    fs.appendFileSync(path.join(app.getPath("userData"), "main.log"), line);
  } catch {
    // Logging must never block startup.
  }
}

function ensureDesktopShortcut() {
  if (process.platform !== "win32") return;
  const markerPath = path.join(app.getPath("userData"), "desktop-shortcut-created");
  if (fs.existsSync(markerPath)) return;

  try {
    const shortcutPath = path.join(app.getPath("desktop"), "SSH OS Bridge.lnk");
    const created = shell.writeShortcutLink(shortcutPath, {
      target: process.execPath,
      cwd: path.dirname(process.execPath),
      description: "SSH OS Bridge",
      icon: process.execPath,
      iconIndex: 0,
    });
    if (created) fs.writeFileSync(markerPath, new Date().toISOString());
  } catch (error) {
    log("Failed to create desktop shortcut", error);
  }
}

async function createWindow() {
  try {
    ensureDesktopShortcut();
    const server = await startServer({ port: 28482, token: serverToken });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 28482;
    const url = `http://127.0.0.1:${port}`;

    mainWindow = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 980,
      minHeight: 640,
      show: false,
      title: "SSH OS Bridge",
      backgroundColor: "#0d1117",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: path.join(__dirname, "preload.js"),
      },
    });

    mainWindow.once("ready-to-show", () => {
      mainWindow.show();
      mainWindow.focus();
    });

    mainWindow.webContents.on("did-fail-load", (_event, code, description, failingUrl) => {
      log(`Failed to load ${failingUrl}: ${code} ${description}`);
      mainWindow.show();
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });

    mainWindow.on("enter-full-screen", () => {
      mainWindow.webContents.send("fullscreen-change", true);
    });

    mainWindow.on("leave-full-screen", () => {
      mainWindow.webContents.send("fullscreen-change", false);
    });

    log(`Loading ${url}`);
    await mainWindow.loadURL(url);
  } catch (error) {
    log("Electron startup failed", error);
    dialog.showErrorBox("SSH OS Bridge failed to start", error.message || String(error));
    app.quit();
  }
}

ipcMain.handle("get-api-token", () => serverToken);

ipcMain.handle("show-save-dialog", async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return dialog.showSaveDialog(win, options);
});

ipcMain.on("start-download", async (event, { url, localPath, transferId, apiToken }) => {
  const http = require("node:http");
  const fileStream = fs.createWriteStream(localPath);
  
  const req = http.get(url, {
    headers: {
      "Authorization": `Bearer ${apiToken}`
    }
  }, (res) => {
    if (res.statusCode !== 200) {
      event.sender.send("download-complete", { transferId, error: `HTTP ${res.statusCode}` });
      fileStream.destroy();
      fs.unlink(localPath, () => {});
      return;
    }

    const total = parseInt(res.headers["content-length"] || "0", 10);
    let received = 0;

    res.on("data", (chunk) => {
      fileStream.write(chunk);
      received += chunk.length;
      const percent = total > 0 ? Math.min(99, Math.round((received / total) * 100)) : 50;
      event.sender.send("download-progress", { transferId, percent, received, total });
    });

    res.on("end", () => {
      fileStream.end(() => {
        event.sender.send("download-complete", { transferId, ok: true });
      });
    });
  });

  req.on("error", (err) => {
    event.sender.send("download-complete", { transferId, error: err.message });
    fileStream.destroy();
    fs.unlink(localPath, () => {});
  });
});

ipcMain.on("toggle-fullscreen", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setFullScreen(!win.isFullScreen());
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", (event) => {
  if (isQuitting) return;
  event.preventDefault();
  isQuitting = true;
  stopServer().finally(() => app.quit());
});
