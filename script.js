let currentPath = "";
let selected = new Set();
let session = null;
let currentItems = [];
let openFilePath = "";
let editor = null;
const logLines = [];
const savedConnectionKey = "sshBridgeConnection";

const pathTitle = document.querySelector("#pathTitle");
const breadcrumbs = document.querySelector("#breadcrumbs");
const fileRows = document.querySelector("#fileRows");
const itemCount = document.querySelector("#itemCount");
const terminalLog = document.querySelector("#terminalLog");
const terminalForm = document.querySelector("#terminalForm");
const terminalInput = document.querySelector("#terminalInput");
const terminalPrompt = document.querySelector("#terminalPrompt");
const runCommandButton = document.querySelector("#runCommandButton");
const hostPath = document.querySelector("#hostPath");
const transferList = document.querySelector("#transferList");
const windows = document.querySelectorAll(".window");
const taskApps = document.querySelectorAll(".task-app");
const taskbarShell = document.querySelector(".taskbar-shell");
const connectPanel = document.querySelector("#connectPanel");
const connectForm = document.querySelector("#connectForm");
const connectButton = document.querySelector("#connectButton");
const connectMessage = document.querySelector("#connectMessage");
const pemFile = document.querySelector("#pemFile");
const privateKey = document.querySelector("#privateKey");
const footerHint = document.querySelector("#footerHint");

const connectionToggle = document.querySelector("#connectionToggle");
const connectionState = document.querySelector("#connectionState");
const connectionHost = document.querySelector("#connectionHost");
const connectionDistro = document.querySelector("#connectionDistro");
const connectionCipher = document.querySelector("#connectionCipher");
const sessionTitle = document.querySelector("#sessionTitle");
const barTime = document.querySelector("#barTime");
const terminalTitle = document.querySelector("#terminalTitle");
const detailStatus = document.querySelector("#detailStatus");
const detailRemote = document.querySelector("#detailRemote");
const detailStartPath = document.querySelector("#detailStartPath");
const detailDistro = document.querySelector("#detailDistro");
const detailShell = document.querySelector("#detailShell");
const openFilePathLabel = document.querySelector("#openFilePath");
const editorStatus = document.querySelector("#editorStatus");
const saveFileButton = document.querySelector("#saveFileButton");

function setMessage(text, tone = "") {
  connectMessage.textContent = text;
  connectMessage.dataset.tone = tone;
}

function command(line, output = "") {
  const prefix = session ? `${session.username}@${session.host}` : "local";
  logLines.push(`$ ${prefix}: ${line}`);
  if (output) logLines.push(output);
  terminalLog.textContent = logLines.slice(-80).join("\n");
  terminalLog.scrollTop = terminalLog.scrollHeight;
}

function updateTerminalPrompt() {
  if (!terminalPrompt) return;
  const promptPath = currentPath || "~";
  terminalPrompt.textContent = session ? `${session.username}@${session.host}:${promptPath} $` : "local $";
}

function formatTime() {
  return new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function updateConnectionDetails() {
  const connected = Boolean(session);
  document.querySelectorAll(".status-dot").forEach((dot) => {
    dot.classList.toggle("disconnected", !connected);
  });

  connectionState.textContent = connected ? "Connected" : "Connect SSH";
  connectionHost.textContent = connected ? `${session.username}@${session.host}:${session.port}` : "Add host details";
  connectionDistro.textContent = connected ? session.distro : "Waiting for SSH";
  connectionCipher.textContent = connected ? session.auth : "Key auth";
  sessionTitle.textContent = connected ? `${session.host} - SSH session` : "No SSH session";
  barTime.textContent = connected ? formatTime() : "--:--";
  terminalTitle.textContent = connected ? `Terminal - ${session.username}@${session.host}` : "Terminal";
  detailStatus.textContent = connected ? "Connected" : "Disconnected";
  detailRemote.textContent = connected ? `${session.username}@${session.host}:${session.port}` : "--";
  detailStartPath.textContent = connected ? session.startPath : "--";
  detailDistro.textContent = connected ? session.distro : "--";
  detailShell.textContent = connected ? session.shell : "--";
  updateTerminalPrompt();
}

function loadSavedConnection() {
  const raw = localStorage.getItem(savedConnectionKey);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    document.querySelector("#sshHost").value = saved.host || "";
    document.querySelector("#sshUser").value = saved.username || "";
    document.querySelector("#sshPort").value = saved.port || "22";
    document.querySelector("#sshStartPath").value = saved.startPath || ".";
    hostPath.value = saved.hostPath || hostPath.value;
  } catch {
    localStorage.removeItem(savedConnectionKey);
  }
}

function saveConnectionValues(payload) {
  localStorage.setItem(
    savedConnectionKey,
    JSON.stringify({
      host: payload.host,
      username: payload.username,
      port: payload.port,
      startPath: payload.startPath,
      hostPath: hostPath.value,
    }),
  );
}

function collectConnectionValues() {
  return {
    host: document.querySelector("#sshHost").value.trim(),
    username: document.querySelector("#sshUser").value.trim(),
    port: document.querySelector("#sshPort").value.trim() || "22",
    startPath: document.querySelector("#sshStartPath").value.trim() || ".",
  };
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function renderBreadcrumbs() {
  breadcrumbs.innerHTML = "";
  if (!currentPath) return;

  const normalized = currentPath.startsWith("/") ? currentPath : `/${currentPath}`;
  const parts = normalized.split("/").filter(Boolean);
  let builtPath = "";

  const rootButton = document.createElement("button");
  rootButton.className = "crumb";
  rootButton.type = "button";
  rootButton.textContent = "/";
  rootButton.addEventListener("click", () => openPath("/"));
  breadcrumbs.append(rootButton);

  parts.forEach((part) => {
    builtPath += `/${part}`;
    const crumbPath = builtPath;
    const button = document.createElement("button");
    button.className = "crumb";
    button.type = "button";
    button.textContent = part;
    button.addEventListener("click", () => openPath(crumbPath));
    breadcrumbs.append(button);
  });
}

function makeCell(text, className = "") {
  const span = document.createElement("span");
  if (className) span.className = className;
  span.textContent = text;
  return span;
}

function renderFiles(items = currentItems) {
  currentItems = items;
  pathTitle.textContent = currentPath || "Connect to browse";
  itemCount.textContent = `${items.length} items`;
  fileRows.innerHTML = "";

  if (!session) {
    const row = document.createElement("div");
    row.className = "empty-row";
    row.textContent = "Enter SSH details to browse remote folders.";
    fileRows.append(row);
    renderBreadcrumbs();
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `file-row file-entry ${selected.has(item.name) ? "selected" : ""}`;

    const nameCell = makeCell("", "file-name");
    const icon = makeCell(item.type === "dir" ? "DIR" : "DOC", `file-icon ${item.type === "dir" ? "folder" : ""}`);
    const label = makeCell(item.name, "file-label");
    nameCell.append(icon, label);

    row.append(nameCell, makeCell(item.type), makeCell(item.size), makeCell(item.modified));
    row.addEventListener("dblclick", () => {
      if (item.type === "dir") openPath(joinPath(currentPath, item.name));
      else openRemoteFile(joinPath(currentPath, item.name));
    });
    row.addEventListener("click", () => {
      if (selected.has(item.name)) selected.delete(item.name);
      else selected.add(item.name);
      renderFiles();
    });
    fileRows.append(row);
  });

  renderBreadcrumbs();
}

function joinPath(base, name) {
  if (base === "/") return `/${name}`;
  return `${base.replace(/\/$/, "")}/${name}`;
}

async function openPath(path) {
  if (!session) {
    connectPanel.classList.remove("hidden");
    focusWindow("settingsWindow");
    return;
  }

  focusWindow("filesWindow");
  currentPath = path;
  selected.clear();
  pathTitle.textContent = path;
  itemCount.textContent = "Loading...";
  fileRows.innerHTML = '<div class="empty-row">Reading remote folder...</div>';
  renderBreadcrumbs();

  try {
    const data = await request(`/api/sessions/${session.id}/list?path=${encodeURIComponent(path)}`);
    currentPath = data.path;
    command(`sftp readdir ${data.path}`, `${data.items.length} remote items`);
    renderFiles(data.items);
    updateTerminalPrompt();
  } catch (error) {
    command(`sftp readdir ${path}`, error.message);
    fileRows.innerHTML = "";
    const row = document.createElement("div");
    row.className = "empty-row error";
    row.textContent = error.message;
    fileRows.append(row);
  }
}

async function runTerminalCommand(event) {
  event.preventDefault();
  const line = terminalInput.value.trim();
  if (!line) return;

  focusWindow("terminalWindow");
  terminalInput.value = "";
  if (!session) {
    command(line, "Connect to SSH first.");
    return;
  }

  runCommandButton.disabled = true;
  command(line);
  try {
    const data = await request(`/api/sessions/${session.id}/command`, {
      method: "POST",
      body: JSON.stringify({ command: line, cwd: currentPath || session.startPath || "." }),
    });
    const output = [data.stdout, data.stderr, data.code ? `exit code ${data.code}` : ""].filter(Boolean).join("\n");
    if (output) {
      logLines.push(output);
      terminalLog.textContent = logLines.slice(-80).join("\n");
      terminalLog.scrollTop = terminalLog.scrollHeight;
    }
    if (data.cwd && data.cwd !== currentPath) {
      currentPath = data.cwd;
      pathTitle.textContent = currentPath;
      renderBreadcrumbs();
      updateTerminalPrompt();
    }
  } catch (error) {
    logLines.push(error.message);
    terminalLog.textContent = logLines.slice(-80).join("\n");
    terminalLog.scrollTop = terminalLog.scrollHeight;
  } finally {
    runCommandButton.disabled = false;
    terminalInput.focus();
  }
}

function inferLanguage(filePath) {
  const extension = filePath.split(".").pop()?.toLowerCase();
  const map = {
    js: "javascript",
    json: "json",
    ts: "typescript",
    html: "html",
    css: "css",
    md: "markdown",
    py: "python",
    sh: "shell",
    yml: "yaml",
    yaml: "yaml",
    xml: "xml",
    sql: "sql",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    rs: "rust",
    php: "php",
    rb: "ruby",
  };
  return map[extension] || "plaintext";
}

function ensureEditor() {
  if (editor || !window.monaco) return editor;
  const editorHost = document.querySelector("#monacoEditor");
  editor = monaco.editor.create(editorHost, {
    value: "",
    language: "plaintext",
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    lineHeight: 21,
    scrollBeyondLastLine: false,
    wordWrap: "on",
  });
  new ResizeObserver(() => editor?.layout()).observe(editorHost);
  new ResizeObserver(() => editor?.layout()).observe(document.querySelector("#editorWindow"));
  return editor;
}

async function openRemoteFile(filePath) {
  if (!session) return;
  focusWindow("editorWindow");
  openFilePath = filePath;
  openFilePathLabel.textContent = filePath;
  editorStatus.textContent = "Loading...";

  try {
    const data = await request(`/api/sessions/${session.id}/file?path=${encodeURIComponent(filePath)}`);
    openFilePath = data.path;
    openFilePathLabel.textContent = data.path;
    const activeEditor = ensureEditor();
    const model = monaco.editor.createModel(data.contents, inferLanguage(data.path));
    const oldModel = activeEditor.getModel();
    activeEditor.setModel(model);
    if (oldModel) oldModel.dispose();
    editorStatus.textContent = "Loaded";
    command(`sftp read ${data.path}`, "file opened in editor");
  } catch (error) {
    editorStatus.textContent = error.message;
    command(`sftp read ${filePath}`, error.message);
  }
}

async function saveOpenFile() {
  if (!session || !openFilePath || !editor) {
    editorStatus.textContent = "Open a file first";
    return;
  }

  editorStatus.textContent = "Saving...";
  try {
    const data = await request(`/api/sessions/${session.id}/file`, {
      method: "PUT",
      body: JSON.stringify({ path: openFilePath, contents: editor.getValue() }),
    });
    openFilePath = data.path;
    openFilePathLabel.textContent = data.path;
    editorStatus.textContent = "Saved";
    command(`sftp write ${data.path}`, "file saved");
  } catch (error) {
    editorStatus.textContent = error.message;
    command(`sftp write ${openFilePath}`, error.message);
  }
}

async function connect(event) {
  event.preventDefault();
  connectButton.disabled = true;
  setMessage("Connecting...", "");

  const payload = {
    host: document.querySelector("#sshHost").value.trim(),
    username: document.querySelector("#sshUser").value.trim(),
    port: Number(document.querySelector("#sshPort").value.trim() || 22),
    startPath: document.querySelector("#sshStartPath").value.trim() || ".",
    privateKey: privateKey.value,
    passphrase: document.querySelector("#passphrase").value,
  };

  try {
    const data = await request("/api/connect", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    saveConnectionValues(payload);
    session = data.session;
    currentPath = data.path;
    updateConnectionDetails();
    connectPanel.classList.add("hidden");
    setMessage("Connected", "success");
    command("ssh handshake", `${session.distro}\n${session.shell}`);
    renderFiles(data.items);
    focusWindow("filesWindow");
  } catch (error) {
    session = null;
    updateConnectionDetails();
    setMessage(error.message, "error");
    command("ssh handshake", error.message);
  } finally {
    connectButton.disabled = false;
  }
}

function copySelected() {
  focusWindow("transferWindow");
  if (!session) {
    command("copy selected", "Connect to SSH first");
    return;
  }
  const items = [...selected];
  if (!items.length) {
    command("copy selected", "No files selected");
    return;
  }

  items.forEach((name) => {
    const item = document.createElement("article");
    item.className = "transfer-item";
    const title = document.createElement("strong");
    title.textContent = name;
    const destination = document.createElement("span");
    destination.textContent = `${joinPath(currentPath, name)} -> ${hostPath.value}`;
    const progress = document.createElement("div");
    progress.className = "progress";
    progress.append(document.createElement("i"));
    item.append(title, destination, progress);
    transferList.prepend(item);
    command(`scp -r ${session.username}@${session.host}:${joinPath(currentPath, name)} "${hostPath.value}"`, "ready to copy from active SSH session");
  });

  selected.clear();
  renderFiles();
}

document.querySelector("#refreshButton").addEventListener("click", () => openPath(currentPath || "."));
document.querySelector("#copySelectedButton").addEventListener("click", copySelected);
document.querySelector("#dropZone").addEventListener("click", copySelected);
saveFileButton.addEventListener("click", saveOpenFile);
hostPath.addEventListener("change", () => {
  saveConnectionValues(collectConnectionValues());
});

["#sshHost", "#sshUser", "#sshPort", "#sshStartPath"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", () => {
    saveConnectionValues(collectConnectionValues());
  });
});
document.querySelector("#clearLogButton").addEventListener("click", () => {
  logLines.length = 0;
  terminalLog.textContent = "";
});
terminalForm.addEventListener("submit", runTerminalCommand);
document.querySelector("#upButton").addEventListener("click", () => {
  if (!currentPath || currentPath === "/") return;
  const parent = currentPath.split("/").slice(0, -1).join("/") || "/";
  openPath(parent);
});

connectForm.addEventListener("submit", connect);
pemFile.addEventListener("change", async () => {
  const [file] = pemFile.files;
  if (!file) return;
  privateKey.value = await file.text();
  setMessage(`${file.name} loaded`, "success");
});

function focusWindow(id) {
  const targetWindow = document.querySelector(`#${id}`);
  if (!targetWindow) return;

  targetWindow.classList.remove("minimized", "closed");
  windows.forEach((windowEl) => {
    windowEl.classList.toggle("focused", windowEl.id === id);
  });
  taskApps.forEach((button) => {
    const relatedWindow = document.querySelector(`#${button.dataset.window}`);
    button.classList.toggle("active", button.dataset.window === id);
    button.classList.toggle("minimized", relatedWindow?.classList.contains("minimized"));
    button.classList.toggle("closed", relatedWindow?.classList.contains("closed"));
  });
  const focusedButton = document.querySelector(`[data-window="${id}"]`);
  if (focusedButton) focusedButton.classList.remove("closed", "minimized");
  targetWindow.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (id === "editorWindow") setTimeout(() => editor?.layout(), 80);
}

function minimizeWindow(id) {
  const targetWindow = document.querySelector(`#${id}`);
  if (!targetWindow) return;

  targetWindow.classList.add("minimized");
  targetWindow.classList.remove("focused");
  taskApps.forEach((button) => {
    button.classList.toggle("active", false);
    button.classList.toggle("minimized", button.dataset.window === id);
  });

  const visibleWindow = [...windows].find((windowEl) => !windowEl.classList.contains("closed") && !windowEl.classList.contains("minimized"));
  if (visibleWindow) focusWindow(visibleWindow.id);
}

function closeWindow(id) {
  const targetWindow = document.querySelector(`#${id}`);
  if (!targetWindow) return;
  targetWindow.classList.add("closed");
  targetWindow.classList.remove("focused", "maximized");
  taskApps.forEach((button) => {
    button.classList.toggle("closed", button.dataset.window === id);
    button.classList.toggle("active", false);
  });
  const visibleWindow = [...windows].find((windowEl) => !windowEl.classList.contains("closed") && !windowEl.classList.contains("minimized"));
  if (visibleWindow) focusWindow(visibleWindow.id);
}

function maximizeWindow(id) {
  const targetWindow = document.querySelector(`#${id}`);
  if (!targetWindow) return;
  targetWindow.classList.remove("minimized", "closed");
  targetWindow.classList.toggle("maximized");
  focusWindow(id);
  if (id === "editorWindow") setTimeout(() => editor?.layout(), 80);
}

taskApps.forEach((button) => {
  button.addEventListener("click", () => {
    focusWindow(button.dataset.window);
  });
});

connectionToggle.addEventListener("click", () => {
  connectPanel.classList.toggle("hidden");
});

windows.forEach((windowEl) => {
  windowEl.addEventListener("pointerdown", () => focusWindow(windowEl.id));
});

document.querySelectorAll("[data-minimize-window]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    minimizeWindow(button.dataset.minimizeWindow);
  });
});

document.querySelectorAll("[data-close-window]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    closeWindow(button.dataset.closeWindow);
  });
});

document.querySelectorAll("[data-maximize-window]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    maximizeWindow(button.dataset.maximizeWindow);
  });
});

setInterval(() => {
  if (session) barTime.textContent = formatTime();
}, 1000);

require.config({ paths: { vs: "./node_modules/monaco-editor/min/vs" } });
require(["vs/editor/editor.main"], () => {
  ensureEditor();
});

loadSavedConnection();
updateConnectionDetails();
renderFiles([]);

setTimeout(() => {
  taskbarShell?.classList.remove("taskbar-open");
}, 5000);
