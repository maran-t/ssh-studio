const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, shell, dialog } = require("electron");
const { startServer, stopServer } = require("./server");

let mainWindow = null;
let isQuitting = false;

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
    const server = await startServer({ port: 28482 });
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

    log(`Loading ${url}`);
    await mainWindow.loadURL(url);
  } catch (error) {
    log("Electron startup failed", error);
    dialog.showErrorBox("SSH OS Bridge failed to start", error.message || String(error));
    app.quit();
  }
}

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
