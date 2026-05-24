let currentPath = "";
let terminalCwd = "";
let editorExplorerPath = "";
let editorExplorerItems = [];
let transferPath = "";
let selected = new Set();
let session = null;
let currentItems = [];
let allDirectoryItems = []; // Pristine cache of all items in current folder
let openFilePath = "";
let editor = null;
let healthTimer = null;
let commandHistoryIndex = -1;
const openFiles = new Map();
const commandHistory = [];
const logLines = [];
const savedConnectionKey = "sshBridgeConnection";
const savedSessionKey = "sshBridgeActiveSession";
const savedLayoutKey = "sshBridgeLayout";
const savedAnimationKey = "sshBridgeAnimations";
const savedEditorExplorerWidthKey = "sshBridgeEditorExplorerWidth";
const savedRecentEditorFoldersKey = "sshBridgeRecentEditorFolders";
const savedRecentAppsKey = "sshBridgeRecentApps";
const preMaximizedBounds = new Map();
let topZIndex = 50;
let isAnimationEnabled = localStorage.getItem(savedAnimationKey) !== "false";

// Phase 3 App upgrades state
let pathHistoryBack = [];
let pathHistoryForward = [];
let lastSelectedIndex = -1;
let isGridView = false;
let showHiddenFiles = false; // Hidden files toggle state
let currentSortColumn = "name";
let currentSortDirection = "asc";
let terminalFontSize = 13;
const editorThemes = ["m2-dark", "vs-dark", "vs"];
let editorTheme = localStorage.getItem("sshBridgeEditorTheme") || "m2-dark";
if (!editorThemes.includes(editorTheme)) editorTheme = "m2-dark";
let isEditorMinimapEnabled = localStorage.getItem("sshBridgeEditorMinimap") !== "false";

// Phase 3B Context Menu Elements
const fileContextMenu = document.querySelector("#fileContextMenu");
const fileContextOpen = document.querySelector("#fileContextOpen");
const fileContextRename = document.querySelector("#fileContextRename");
const fileContextDownload = document.querySelector("#fileContextDownload");
const fileContextCopyPath = document.querySelector("#fileContextCopyPath");
const fileContextDelete = document.querySelector("#fileContextDelete");
let activeItemForFileContext = null;

// Phase 3C Context Menu & History Elements
const tabContextMenu = document.querySelector("#tabContextMenu");
const tabContextClose = document.querySelector("#tabContextClose");
const tabContextCloseOthers = document.querySelector("#tabContextCloseOthers");
const tabContextCloseSaved = document.querySelector("#tabContextCloseSaved");
const tabContextCloseAll = document.querySelector("#tabContextCloseAll");
let activeTabForContext = null;
let isAltTabOpen = false;
let altTabItems = [];
let altTabIndex = 0;
let altTabCloseKey = "Alt";
const launchedWindowIds = new Set();

const toggleHistoryBtn = document.querySelector("#toggleHistoryBtn");
const closeHistoryBtn = document.querySelector("#closeHistoryBtn");
const terminalHistoryPanel = document.querySelector("#terminalHistoryPanel");
const historyPanelList = document.querySelector("#historyPanelList");

const pathTitle = document.querySelector("#pathTitle");
const breadcrumbs = document.querySelector("#breadcrumbs");
const fileRows = document.querySelector("#fileRows");
const itemCount = document.querySelector("#itemCount");
const selectionCount = document.querySelector("#selectionCount");
const terminalBody = document.querySelector("#terminalBody");
const terminalLog = document.querySelector("#terminalLog");
const terminalForm = document.querySelector("#terminalForm");
const terminalInput = document.querySelector("#terminalInput");
const terminalPrompt = document.querySelector("#terminalPrompt");
const runCommandButton = document.querySelector("#runCommandButton");
const transferList = document.querySelector("#transferList");
const backButton = document.querySelector("#backButton");
const forwardButton = document.querySelector("#forwardButton");
const fileSearch = document.querySelector("#fileSearch");
const viewToggleBtn = document.querySelector("#viewToggleBtn");
const fileTable = document.querySelector("#fileTable");
const localFilePicker = document.querySelector("#localFilePicker");
const uploadDestPath = document.querySelector("#uploadDestPath");
const transferUseFilesPath = document.querySelector("#transferUseFilesPath");
const transferUseEditorPath = document.querySelector("#transferUseEditorPath");
const transferChoosePath = document.querySelector("#transferChoosePath");
const clearTransferHistory = document.querySelector("#clearTransferHistory");
const terminalSearch = document.querySelector("#terminalSearch");
const terminalZoomIn = document.querySelector("#terminalZoomIn");
const terminalZoomOut = document.querySelector("#terminalZoomOut");
const terminalFontSizeLabel = document.querySelector("#terminalFontSizeLabel");
const editorCursorPos = document.querySelector("#editorCursorPos");
const editorLanguage = document.querySelector("#editorLanguage");
const editorIndent = document.querySelector("#editorIndent");
const editorEncoding = document.querySelector("#editorEncoding");
const editorOpenList = document.querySelector("#editorOpenList");
const editorCloseAllButton = document.querySelector("#editorCloseAllButton");
const editorRefreshExplorerButton = document.querySelector("#editorRefreshExplorerButton");
const editorNewFileButton = document.querySelector("#editorNewFileButton");
const editorNewFolderButton = document.querySelector("#editorNewFolderButton");
const editorExplorerSearch = document.querySelector("#editorExplorerSearch");
const editorFolderPath = document.querySelector("#editorFolderPath");
const editorFolderList = document.querySelector("#editorFolderList");
const editorWelcome = document.querySelector("#editorWelcome");
const editorWorkbench = document.querySelector(".editor-workbench");
const editorSplitter = document.querySelector("#editorSplitter");
const welcomeOpenFolderButton = document.querySelector("#welcomeOpenFolderButton");
const welcomeOpenFilesButton = document.querySelector("#welcomeOpenFilesButton");
const welcomeCommandButton = document.querySelector("#welcomeCommandButton");
const welcomeRecentFolders = document.querySelector("#welcomeRecentFolders");
const commandPaletteButton = document.querySelector("#commandPaletteButton");
const findReplaceButton = document.querySelector("#findReplaceButton");
const themeToggleButton = document.querySelector("#themeToggleButton");
const minimapToggleButton = document.querySelector("#minimapToggleButton");
const commandPalette = document.querySelector("#commandPalette");
const commandPaletteInput = document.querySelector("#commandPaletteInput");
const commandPaletteList = document.querySelector("#commandPaletteList");
const windows = document.querySelectorAll(".window");
const taskApps = document.querySelectorAll(".task-app");
const desktopRecentApps = document.querySelector("#desktopRecentApps");
const altTabOverlay = document.querySelector("#altTabOverlay");
const altTabList = document.querySelector("#altTabList");
const startMenuPanel = document.querySelector("#startMenuPanel");
const startAccountName = document.querySelector("#startAccountName");
const startAccountHost = document.querySelector("#startAccountHost");
const startAccountDistro = document.querySelector("#startAccountDistro");
const startAccountPath = document.querySelector("#startAccountPath");
const startAvatar = document.querySelector("#startAvatar");
const startDisconnectButton = document.querySelector("#startDisconnectButton");
const taskbarShell = document.querySelector(".taskbar-shell");
const workspaceBar = document.querySelector(".workspace-bar");
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
const disconnectButton = document.querySelector("#disconnectButton");
const closeConnectButton = document.querySelector("#closeConnectButton");
const editorTabs = document.querySelector("#editorTabs");
const openFileButton = document.querySelector("#openFileButton");
const newFileButton = document.querySelector("#newFileButton");
const newFolderButton = document.querySelector("#newFolderButton");
const renameButton = document.querySelector("#renameButton");
const deleteButton = document.querySelector("#deleteButton");
const uploadButton = document.querySelector("#uploadButton");
const animationToggle = document.querySelector("#animationToggle");

// ==========================================
// Custom elegant toast notification system
// ==========================================
function showToast(message, type = "info", title = "") {
  const container = document.querySelector("#toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const defaultTitles = {
    success: "Success",
    error: "System Error",
    info: "Notification"
  };

  const icons = {
    success: "✓",
    error: "✕",
    info: "i"
  };

  const iconHtml = `<span class="toast-icon">${icons[type] || "i"}</span>`;
  const finalTitle = title || defaultTitles[type] || "Info";

  toast.innerHTML = `
    ${iconHtml}
    <div class="toast-content">
      <h4 class="toast-title">${finalTitle}</h4>
      <p class="toast-message">${escapeHtml(message)}</p>
    </div>
    <button class="toast-close" type="button" aria-label="Close message">&times;</button>
  `;

  const closeBtn = toast.querySelector(".toast-close");
  const dismiss = () => {
    if (toast.classList.contains("hiding")) return;
    toast.classList.add("hiding");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  };

  closeBtn.addEventListener("click", dismiss);

  // Auto-dismiss toast
  setTimeout(dismiss, 4500);

  container.appendChild(toast);
}

// ==========================================
// Custom elegant modal dialog system
// ==========================================
function showModal({ title, message, type = "alert", defaultValue = "" }) {
  return new Promise((resolve) => {
    const modal = document.querySelector("#customModal");
    const titleEl = document.querySelector("#modalTitle");
    const messageEl = document.querySelector("#modalMessage");
    const inputContainer = document.querySelector("#modalInputContainer");
    const inputEl = document.querySelector("#modalInput");
    const cancelBtn = document.querySelector("#modalCancelButton");
    const confirmBtn = document.querySelector("#modalConfirmButton");
    const closeX = document.querySelector("#modalCloseX");

    titleEl.textContent = title || "Confirm";
    messageEl.textContent = message || "";

    if (type === "prompt") {
      inputContainer.classList.remove("hidden");
      inputEl.value = defaultValue;
    } else {
      inputContainer.classList.add("hidden");
    }

    if (type === "alert") {
      cancelBtn.classList.add("hidden");
    } else {
      cancelBtn.classList.remove("hidden");
    }

    modal.classList.remove("hidden");
    if (type === "prompt") {
      setTimeout(() => {
        inputEl.focus();
        inputEl.select();
      }, 50);
    } else {
      setTimeout(() => confirmBtn.focus(), 50);
    }

    const cleanUp = () => {
      modal.classList.add("hidden");
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      closeX.removeEventListener("click", onCancel);
      inputEl.removeEventListener("keydown", onKeyDown);
    };

    const onConfirm = () => {
      const val = type === "prompt" ? inputEl.value : true;
      cleanUp();
      resolve(val);
    };

    const onCancel = () => {
      cleanUp();
      resolve(type === "prompt" ? null : false);
    };

    const onKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
    closeX.addEventListener("click", onCancel);
    inputEl.addEventListener("keydown", onKeyDown);
  });
}

window.osAlert = (message, title = "System message") => {
  showToast(message, "info", title);
};

window.osConfirm = (message, title = "Confirm Action") => {
  return showModal({ title, message, type: "confirm" });
};

window.osPrompt = (message, defaultValue = "", title = "Prompt Input") => {
  return showModal({ title, message, type: "prompt", defaultValue });
};

// ==========================================
// skeleton loader row rendering
// ==========================================
function renderSkeleton() {
  fileRows.innerHTML = "";
  for (let i = 0; i < 6; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton-row";
    skeleton.innerHTML = `
      <div class="skeleton-cell icon"></div>
      <div class="skeleton-cell name"></div>
      <div class="skeleton-cell meta"></div>
      <div class="skeleton-cell meta"></div>
    `;
    fileRows.appendChild(skeleton);
  }
}

function setMessage(text, tone = "") {
  connectMessage.textContent = text;
  connectMessage.dataset.tone = tone;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseAnsiColors(text, query = "") {
  let escaped = escapeHtml(text);
  
  if (query) {
    // Escape query characters for regex safety
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const placeholders = [];
    
    // Safely swap ANSI sequences with placeholders
    escaped = escaped.replace(/\x1B\[([\d;]*)m/g, (match) => {
      placeholders.push(match);
      return `\x1BPLACEHOLDER_${placeholders.length - 1}\x1B`;
    });
    
    // Highlight the search terms safely
    escaped = escaped.replace(regex, `<mark class="terminal-match">$1</mark>`);
    
    // Restore the ANSI sequences
    escaped = escaped.replace(/\x1BPLACEHOLDER_(\d+)\x1B/g, (match, idx) => {
      return placeholders[parseInt(idx)];
    });
  }
  
  // Standard ANSI style tags
  const ansiStyles = {
    "30": "color: #475569;", // Muted black
    "31": "color: #ef5f57; font-weight: bold;", // Red
    "32": "color: #10b981; font-weight: bold;", // Green
    "33": "color: #f59e0b; font-weight: bold;", // Yellow
    "34": "color: #3b82f6; font-weight: bold;", // Blue
    "35": "color: #a855f7; font-weight: bold;", // Magenta
    "36": "color: #06b6d4; font-weight: bold;", // Cyan
    "37": "color: #cbd5e1;", // White
    "1": "font-weight: bold;", // Bold
  };

  // Convert ANSI escape codes to styled HTML span tags
  const result = escaped.replace(/\x1B\[([\d;]*)m/g, (match, codes) => {
    if (!codes || codes === "0") return "</span>";
    let styles = "";
    codes.split(";").forEach(code => {
      if (ansiStyles[code]) styles += ansiStyles[code];
    });
    return styles ? `<span style="${styles}">` : "";
  });

  // Automatically count and balance span tags to prevent syntax leakage
  const openSpans = (result.match(/<span/g) || []).length;
  const closeSpans = (result.match(/<\/span>/g) || []).length;
  let balanced = result;
  for (let i = 0; i < (openSpans - closeSpans); i++) {
    balanced += "</span>";
  }
  return balanced;
}

function renderTerminalLog(lines = logLines, query = "") {
  terminalLog.innerHTML = lines
    .slice(-120)
    .map((entry) => `<span class="terminal-line ${entry.type || "stdout"}">${parseAnsiColors(entry.text, query)}</span>`)
    .join("");
  if (terminalBody) {
    terminalBody.scrollTop = terminalBody.scrollHeight;
  }
}

function pushTerminal(text, type = "stdout") {
  if (!text) return;
  
  let str = String(text);
  // Strip trailing newline if it exists (since in our line-based list,
  // a trailing newline represents line termination, not a new empty line)
  if (str.endsWith("\n")) {
    str = str.slice(0, -1);
  }
  if (str.endsWith("\r")) {
    str = str.slice(0, -1);
  }
  
  const lines = str.split("\n");
  // Trim any trailing empty lines produced by trailing newline split
  if (lines.length > 1 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  
  lines.forEach((line) => {
    const cleanLine = line.endsWith("\r") ? line.slice(0, -1) : line;
    logLines.push({ type, text: cleanLine });
  });
    
  const query = terminalSearch ? terminalSearch.value.toLowerCase().trim() : "";
  if (query) {
    const filtered = logLines.filter(line => line.text.toLowerCase().includes(query));
    renderTerminalLog(filtered, query);
  } else {
    renderTerminalLog();
  }
}

function command(line, output = "") {
  const promptPath = terminalCwd || session?.startPath || "~";
  const prefix = session ? `${session.username}@${session.host}:${promptPath} $` : "local $";
  pushTerminal(`${prefix} ${line}`, "command");
  if (output) pushTerminal(output);
}

function updateTerminalPrompt() {
  if (!terminalPrompt) return;
  const promptPath = terminalCwd || session?.startPath || "~";
  terminalPrompt.textContent = session ? `${session.username}@${session.host}:${promptPath} $` : "local $";
}

function focusTerminalInputAtBottom() {
  if (!terminalInput) return;
  if (terminalBody) {
    terminalBody.scrollTop = terminalBody.scrollHeight;
  }
  terminalInput.focus();
  const end = terminalInput.value.length;
  terminalInput.setSelectionRange(end, end);
}

function formatTime() {
  return new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function updateConnectionDetails() {
  const connected = Boolean(session);
  document.querySelectorAll(".status-dot").forEach((dot) => {
    dot.classList.toggle("disconnected", !connected);
  });

  setConnectionState(connected ? "Connected" : "Connect SSH", connected ? "success" : "");
  connectionHost.textContent = connected ? `${session.username}@${session.host}:${session.port}` : "Add host details";
  connectionDistro.textContent = connected ? session.distro : "Waiting for SSH";
  connectionCipher.textContent = connected ? session.auth : "Key auth";
  sessionTitle.textContent = connected ? `${session.host} - SSH session` : "No SSH session";
  barTime.textContent = formatTime();
  terminalTitle.textContent = connected ? `Terminal - ${session.username}@${session.host}` : "Terminal";
  detailStatus.textContent = connected ? "Connected" : "Disconnected";
  detailRemote.textContent = connected ? `${session.username}@${session.host}:${session.port}` : "--";
  detailStartPath.textContent = connected ? session.startPath : "--";
  detailDistro.textContent = connected ? session.distro : "--";
  detailShell.textContent = connected ? session.shell : "--";
  disconnectButton.classList.toggle("visible", connected);
  if (!connected) closeStartMenu(false);
  if (startAccountName) startAccountName.textContent = connected ? session.username : "Not connected";
  if (startAccountHost) startAccountHost.textContent = connected ? `${session.username}@${session.host}:${session.port}` : "Connect to SSH to launch apps";
  if (startAccountDistro) startAccountDistro.textContent = connected ? session.distro : "Waiting for SSH";
  if (startAccountPath) startAccountPath.textContent = connected ? `Start folder: ${session.startPath}` : "--";
  if (startAvatar) startAvatar.textContent = connected ? session.username.slice(0, 2).toUpperCase() : "SSH";
  updateTerminalPrompt();
}

function stopHealthChecks() {
  if (healthTimer) clearInterval(healthTimer);
  healthTimer = null;
}

function startHealthChecks() {
  stopHealthChecks();
  healthTimer = setInterval(async () => {
    if (!session) return;
    try {
      await request(`/api/sessions/${session.id}/health`);
    } catch {
      // request() handles the expired-session UI state.
    }
  }, 15000);
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
    
    // Retrieve private key from sessionStorage for security
    const sessKey = sessionStorage.getItem("sshBridgePrivateKey");
    if (sessKey) {
      privateKey.value = sessKey;
      const nameLabel = document.querySelector("#pemFileName");
      if (nameLabel) nameLabel.textContent = saved.pemFileName || "Key Loaded";
    }
  } catch {
    localStorage.removeItem(savedConnectionKey);
    sessionStorage.removeItem("sshBridgePrivateKey");
  }
}

function saveConnectionValues(payload) {
  const nameLabel = document.querySelector("#pemFileName")?.textContent || "Loaded Key";
  localStorage.setItem(
    savedConnectionKey,
    JSON.stringify({
      host: payload.host,
      username: payload.username,
      port: payload.port,
      startPath: payload.startPath,
      pemFileName: nameLabel !== "Load Private Key (.pem)" ? nameLabel : ""
    }),
  );
  if (payload.privateKey) {
    sessionStorage.setItem("sshBridgePrivateKey", payload.privateKey);
  } else {
    sessionStorage.removeItem("sshBridgePrivateKey");
  }
}

function saveActiveSession(path = currentPath) {
  if (!session) return;
  localStorage.setItem(
    savedSessionKey,
    JSON.stringify({
      session,
      path: path || session.startPath || ".",
      terminalCwd: terminalCwd || session.startPath || ".",
      editorExplorerPath: editorExplorerPath || path || session.startPath || ".",
      transferPath: transferPath || path || session.startPath || ".",
      savedAt: Date.now(),
    }),
  );
}

function loadActiveSession() {
  const raw = localStorage.getItem(savedSessionKey);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    if (!saved?.session?.id) return null;
    return saved;
  } catch {
    localStorage.removeItem(savedSessionKey);
    return null;
  }
}

function clearActiveSession() {
  localStorage.removeItem(savedSessionKey);
}

function getRecentEditorFolders() {
  try {
    const value = JSON.parse(localStorage.getItem(savedRecentEditorFoldersKey) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function addRecentEditorFolder(path) {
  if (!path) return;
  const recent = getRecentEditorFolders().filter((item) => item !== path);
  recent.unshift(path);
  localStorage.setItem(savedRecentEditorFoldersKey, JSON.stringify(recent.slice(0, 8)));
  renderWelcomeRecentFolders();
}

function getSavedConnectionValues() {
  const raw = localStorage.getItem(savedConnectionKey);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    const sessKey = sessionStorage.getItem("sshBridgePrivateKey");
    if (sessKey) {
      saved.privateKey = sessKey;
    }
    return saved;
  } catch {
    localStorage.removeItem(savedConnectionKey);
    sessionStorage.removeItem("sshBridgePrivateKey");
    return null;
  }
}

function collectConnectionValues() {
  return {
    host: document.querySelector("#sshHost").value.trim(),
    username: document.querySelector("#sshUser").value.trim(),
    port: document.querySelector("#sshPort").value.trim() || "22",
    startPath: document.querySelector("#sshStartPath").value.trim() || ".",
    privateKey: privateKey.value,
  };
}

let autoConnectTimer = null;
let countdownVal = 5;

function startAutoConnect() {
  const hostVal = document.querySelector("#sshHost")?.value.trim();
  const userVal = document.querySelector("#sshUser")?.value.trim();
  const keyVal = privateKey.value.trim();
  
  if (!hostVal || !userVal || !keyVal) return;
  
  const cancelBtn = document.querySelector("#stopAutoConnectBtn");
  if (cancelBtn) cancelBtn.classList.remove("hidden");
  
  countdownVal = 5;
  const updateTimer = () => {
    if (countdownVal > 0) {
      connectButton.textContent = `Sign In (${countdownVal})`;
      countdownVal--;
      autoConnectTimer = setTimeout(updateTimer, 1000);
    } else {
      connectButton.textContent = "Sign In";
      if (cancelBtn) cancelBtn.classList.add("hidden");
      connectForm.dispatchEvent(new Event("submit"));
    }
  };
  updateTimer();
}

function cancelAutoConnect() {
  if (autoConnectTimer) {
    clearTimeout(autoConnectTimer);
    autoConnectTimer = null;
  }
  connectButton.textContent = "Sign In";
  const cancelBtn = document.querySelector("#stopAutoConnectBtn");
  if (cancelBtn) cancelBtn.classList.add("hidden");
}

async function request(path, options = {}) {
  const { skipSessionExpiryHandler = false, ...fetchOptions } = options;
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(fetchOptions.headers || {}) },
    ...fetchOptions,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || "Request failed";
    if (!skipSessionExpiryHandler && message.includes("SSH session is not active")) markSessionExpired(message);
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function setConnectionState(text, tone = "") {
  connectionState.textContent = text;
  connectionState.dataset.tone = tone;
}

function setTransferPath(path) {
  transferPath = path || session?.startPath || ".";
  if (uploadDestPath) uploadDestPath.textContent = transferPath;
  saveActiveSession(currentPath);
}

function markSessionExpired(message = "SSH session expired. Connect again.") {
  if (!session) return;
  stopHealthChecks();
  session = null;
  clearActiveSession();
  setMessage(message, "error");
  showToast(message, "error", "Session Expired");
  disconnectButton.classList.remove("visible");
  updateConnectionDetails();
  setConnectionState("Reconnect", "error");
  renderFiles([]);
  pushTerminal(message, "error");
}

function renderBreadcrumbs() {
  breadcrumbs.innerHTML = "";
  breadcrumbs.classList.toggle("hidden", !currentPath);
  if (!currentPath) return;

  const normalized = currentPath.startsWith("/") ? currentPath : `/${currentPath}`;
  const parts = normalized.split("/").filter(Boolean);
  let builtPath = "";

  const rootButton = document.createElement("button");
  rootButton.className = "crumb";
  rootButton.type = "button";
  rootButton.textContent = "/";
  rootButton.addEventListener("click", () => changePath("/"));
  breadcrumbs.append(rootButton);

  parts.forEach((part) => {
    builtPath += `/${part}`;
    const crumbPath = builtPath;
    const button = document.createElement("button");
    button.className = "crumb";
    button.type = "button";
    button.textContent = part;
    button.addEventListener("click", () => changePath(crumbPath));
    breadcrumbs.append(button);
  });

  // Highlight the last crumb
  const crumbs = breadcrumbs.querySelectorAll(".crumb");
  if (crumbs.length > 0) {
    crumbs[crumbs.length - 1].classList.add("crumb-active");
  }
}

function makeCell(text, className = "") {
  const span = document.createElement("span");
  if (className) span.className = className;
  span.textContent = text;
  return span;
}

function getSelectedItems() {
  return currentItems.filter((item) => selected.has(item.name));
}

function getPrimarySelectedItem() {
  return getSelectedItems()[0] || null;
}

function getFileIconInfo(name, type) {
  if (type === "dir") return { symbol: "📁", className: "folder" };
  const ext = name.split(".").pop().toLowerCase();
  const codeExts = ["js", "ts", "json", "py", "sh", "html", "css", "md", "rs", "go", "cpp", "c", "h", "java", "yml", "yaml", "xml"];
  const imageExts = ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"];
  const archiveExts = ["zip", "tar", "gz", "rar", "7z"];
  
  if (codeExts.includes(ext)) return { symbol: "💻", className: "code" };
  if (imageExts.includes(ext)) return { symbol: "🖼️", className: "image" };
  if (archiveExts.includes(ext)) return { symbol: "📦", className: "archive" };
  return { symbol: "📄", className: "file" };
}

function getFilteredItems() {
  let list = allDirectoryItems;
  if (!showHiddenFiles) {
    list = list.filter(item => !item.name.startsWith("."));
  }
  const query = fileSearch ? fileSearch.value.toLowerCase().trim() : "";
  if (query) {
    list = list.filter(item => item.name.toLowerCase().includes(query));
  }
  return list;
}

function renderFiles(items = getFilteredItems(), updateCache = false) {
  if (updateCache) {
    allDirectoryItems = items;
  }
  
  const displayItems = updateCache ? getFilteredItems() : items;
  currentItems = displayItems;
  
  pathTitle.textContent = currentPath || "Connect to browse";
  
  const totalVisible = allDirectoryItems.filter(item => showHiddenFiles || !item.name.startsWith(".")).length;
  const query = fileSearch ? fileSearch.value.toLowerCase().trim() : "";
  if (query) {
    itemCount.textContent = `${displayItems.length} of ${totalVisible} items`;
  } else {
    itemCount.textContent = `${totalVisible} items`;
  }
  selectionCount.textContent = `${selected.size} selected`;
  fileRows.innerHTML = "";
  renderEditorExplorer();

  if (!session) {
    const row = document.createElement("div");
    row.className = "empty-row";
    row.textContent = "Enter SSH details to browse remote folders.";
    fileRows.append(row);
    renderBreadcrumbs();
    return;
  }

  if (displayItems.length === 0) {
    const emptyContainer = document.createElement("div");
    emptyContainer.className = "empty-state-container";
    emptyContainer.innerHTML = `
      <div class="empty-state-icon">📂</div>
      <h3 class="empty-state-title">No items found</h3>
      <p class="empty-state-message">This folder is empty, or no files match your active filters.</p>
    `;
    fileRows.append(emptyContainer);
    renderBreadcrumbs();
    return;
  }

  displayItems.forEach((item, index) => {
    const row = document.createElement("button");
    row.type = "button";
    row.setAttribute("role", "row");
    row.className = `file-row file-entry ${selected.has(item.name) ? "selected" : ""}`;

    const iconInfo = getFileIconInfo(item.name, item.type);

    const nameCell = makeCell("", "file-name");
    const icon = makeCell(iconInfo.symbol, `file-icon ${iconInfo.className}`);
    const label = makeCell(item.name, "file-label");
    label.title = item.name;
    nameCell.append(icon, label);

    row.append(nameCell, makeCell(item.type), makeCell(item.size), makeCell(item.modified));
    
    // Double click to open folder/file
    row.addEventListener("dblclick", () => {
      if (item.type === "dir") changePath(joinPath(currentPath, item.name));
      else openRemoteFile(joinPath(currentPath, item.name));
    });
    
    // Desktop Explorer style multi-select (Ctrl / Shift range)
    row.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey) {
        if (selected.has(item.name)) selected.delete(item.name);
        else selected.add(item.name);
        lastSelectedIndex = index;
      } else if (event.shiftKey && lastSelectedIndex !== -1) {
        selected.clear();
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          selected.add(displayItems[i].name);
        }
      } else {
        selected.clear();
        selected.add(item.name);
        lastSelectedIndex = index;
      }
      renderFiles(displayItems);
    });

    // Right-click context menu on row
    row.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      // Select the row on right click if not already selected
      if (!selected.has(item.name)) {
        selected.clear();
        selected.add(item.name);
        lastSelectedIndex = index;
        renderFiles(displayItems);
      }
      
      activeItemForFileContext = item;
      
      // Close taskbar context menu
      contextMenu?.classList.add("hidden");
      
      // Position and show file context menu
      fileContextMenu.style.left = `${event.clientX}px`;
      fileContextMenu.style.top = `${event.clientY}px`;
      fileContextMenu.classList.remove("hidden");
    });

    fileRows.append(row);
  });

  renderBreadcrumbs();
}

async function runFileAction(action, payload = {}) {
  if (!session) {
    command("file action", "Connect to SSH first");
    return;
  }

  const { updateFileExplorer = true, ...actionPayload } = payload;
  try {
    const data = await request(`/api/sessions/${session.id}/file-action`, {
      method: "POST",
      body: JSON.stringify({ action, path: currentPath || session.startPath || ".", ...actionPayload }),
    });
    if (updateFileExplorer) {
      currentPath = data.path;
      selected.clear();
      renderFiles(data.items, true);
    }
  } catch (error) {
    showToast(error.message, "error");
  }
}

function openSelectedItem() {
  const item = getPrimarySelectedItem();
  if (!item) {
    command("open selected", "No file selected");
    return;
  }
  if (item.type === "dir") changePath(joinPath(currentPath, item.name));
  else openRemoteFile(joinPath(currentPath, item.name));
}

async function createFile(type) {
  const label = type === "dir" ? "folder" : "file";
  const name = await window.osPrompt(`New ${label} name`, "", `Create ${label}`);
  if (!name) return;
  try {
    await runFileAction(type === "dir" ? "new-folder" : "new-file", { name });
    showToast(`${type === "dir" ? "Folder" : "File"} "${name}" created successfully`, "success");
  } catch (err) {
    showToast(`Failed to create ${label}: ${err.message}`, "error");
  }
}

async function renameSelectedItem() {
  const item = getPrimarySelectedItem();
  if (!item) {
    command("rename selected", "No item selected");
    showToast("No item selected to rename", "info");
    return;
  }
  const targetName = await window.osPrompt("Rename to", item.name, "Rename Item");
  if (!targetName || targetName === item.name) return;
  try {
    await runFileAction("rename", { name: item.name, targetName });
    showToast(`Renamed successfully to "${targetName}"`, "success");
  } catch (err) {
    showToast(`Failed to rename: ${err.message}`, "error");
  }
}

async function deleteSelectedItem() {
  const item = getPrimarySelectedItem();
  if (!item) {
    command("delete selected", "No item selected");
    showToast("No item selected to delete", "info");
    return;
  }
  const confirmed = await window.osConfirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`, "Delete Item");
  if (!confirmed) return;
  try {
    await runFileAction("delete", { name: item.name, type: item.type });
    showToast(`Successfully deleted "${item.name}"`, "success");
  } catch (err) {
    showToast(`Failed to delete: ${err.message}`, "error");
  }
}

// showUploadPlaceholder removed

function joinPath(base, name) {
  if (base === "/") return `/${name}`;
  return `${base.replace(/\/$/, "")}/${name}`;
}

async function changePath(path, pushHistory = true) {
  if (pushHistory && currentPath) {
    pathHistoryBack.push(currentPath);
    pathHistoryForward = [];
  }
  await openPath(path);
  if (backButton) backButton.disabled = pathHistoryBack.length === 0;
  if (forwardButton) forwardButton.disabled = pathHistoryForward.length === 0;
}

async function openPath(path) {
  if (fileSearch) fileSearch.value = ""; // Clear active search query on navigation
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
  renderSkeleton();
  renderBreadcrumbs();

  try {
    const data = await request(`/api/sessions/${session.id}/list?path=${encodeURIComponent(path)}`);
    currentPath = data.path;
    if (!editorExplorerPath) {
      editorExplorerPath = data.path;
      editorExplorerItems = data.items;
    }
    saveActiveSession(currentPath);
    renderFiles(data.items, true);
  } catch (error) {
    fileRows.innerHTML = "";
    const row = document.createElement("div");
    row.className = "empty-row error";
    row.textContent = error.message;
    fileRows.append(row);
    showToast(`Failed to read remote folder: ${error.message}`, "error");
  }
}

function sortFiles(column) {
  if (currentSortColumn === column) {
    currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
  } else {
    currentSortColumn = column;
    currentSortDirection = "asc";
  }
  
  const parseSizeToBytes = (sizeStr) => {
    if (!sizeStr || sizeStr === "-") return -1;
    const match = sizeStr.match(/^([\d\.]+)\s*(B|KB|MB|GB|TB)$/i);
    if (!match) return 0;
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const units = { B: 1, KB: 1024, MB: 1024*1024, GB: 1024*1024*1024, TB: 1024*1024*1024*1024 };
    return val * (units[unit] || 1);
  };

  allDirectoryItems.sort((a, b) => {
    // Directories always remain grouped at the top when sorting by name
    if (column === "name" && a.type !== b.type) {
      return a.type === "dir" ? -1 : 1;
    }

    let valA = a[column === "kind" ? "type" : column] || "";
    let valB = b[column === "kind" ? "type" : column] || "";
    
    if (column === "size") {
      valA = parseSizeToBytes(a.size);
      valB = parseSizeToBytes(b.size);
    } else if (column === "modified") {
      valA = Date.parse(a.modified) || 0;
      valB = Date.parse(b.modified) || 0;
    }

    if (typeof valA === "string") {
      return currentSortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else {
      return currentSortDirection === "asc"
        ? valA - valB
        : valB - valA;
    }
  });

  // Update visual sort headers
  document.querySelectorAll(".sort-header").forEach(header => {
    const icon = header.querySelector(".sort-direction-icon");
    if (!icon) return;
    if (header.dataset.sort === column) {
      icon.textContent = currentSortDirection === "asc" ? " ▴" : " ▾";
      header.classList.add("active");
    } else {
      icon.textContent = "";
      header.classList.remove("active");
    }
  });

  renderFiles(getFilteredItems());
}

async function runTerminalCommand() {
  const line = terminalInput.value.trim();
  if (!line) return;

  focusWindow("terminalWindow");
  terminalInput.value = "";
  commandHistory.push(line);
  commandHistoryIndex = commandHistory.length;
  renderCommandHistory();
  if (!session) {
    command(line, "Connect to SSH first.");
    return;
  }

  runCommandButton.disabled = true;
  command(line);
  try {
    const data = await request(`/api/sessions/${session.id}/command`, {
      method: "POST",
      body: JSON.stringify({ command: line, cwd: terminalCwd || session.startPath || "." }),
    });
    if (data.stdout) pushTerminal(data.stdout, "stdout");
    if (data.stderr) pushTerminal(data.stderr, "stderr");
    if (data.code) pushTerminal(`exit code ${data.code}`, "exit");
    if (data.cwd && data.cwd !== terminalCwd) {
      terminalCwd = data.cwd;
      saveActiveSession(currentPath);
      updateTerminalPrompt();
    }
  } catch (error) {
    pushTerminal(error.message, "error");
  } finally {
    runCommandButton.disabled = false;
    terminalInput.focus();
  }
}

function inferLanguage(filePath) {
  const name = filePath.split("/").pop()?.toLowerCase() || "";
  const basenameMap = {
    dockerfile: "dockerfile",
    makefile: "makefile",
    "package.json": "json",
    "tsconfig.json": "jsonc",
    "jsconfig.json": "jsonc",
    ".env": "dotenv",
    ".gitignore": "ignore",
  };
  if (basenameMap[name]) return basenameMap[name];
  const extension = filePath.split(".").pop()?.toLowerCase();
  const map = {
    js: "javascript",
    jsx: "javascript",
    json: "json",
    jsonc: "jsonc",
    ts: "typescript",
    tsx: "typescript",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    md: "markdown",
    py: "python",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
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
    toml: "toml",
    ini: "ini",
    env: "dotenv",
  };
  return map[extension] || "plaintext";
}

function formatLanguageLabel(language) {
  const labels = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    json: "JSON",
    jsonc: "JSONC",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    markdown: "Markdown",
    python: "Python",
    shell: "Shell",
    yaml: "YAML",
    xml: "XML",
    plaintext: "Plain Text",
  };
  return labels[language] || language.replace(/^\w/, (char) => char.toUpperCase());
}

function updateEditorStatusBar() {
  if (!editor) return;
  const position = editor.getPosition();
  const selection = editor.getSelection();
  const model = editor.getModel();
  if (position && editorCursorPos) {
    let text = `Ln ${position.lineNumber}, Col ${position.column}`;
    if (selection && !selection.isEmpty()) {
      text += ` (${model.getValueInRange(selection).length} selected)`;
    }
    editorCursorPos.textContent = text;
  }
  if (editorIndent && model) {
    const options = model.getOptions();
    editorIndent.textContent = `${options.insertSpaces ? "Spaces" : "Tab Size"}: ${options.tabSize}`;
  }
  if (editorEncoding) editorEncoding.textContent = "UTF-8";
  if (editorLanguage && openFilePath) editorLanguage.textContent = formatLanguageLabel(inferLanguage(openFilePath));
}

function defineM2MonacoTheme() {
  if (!window.monaco || defineM2MonacoTheme.done) return;
  defineM2MonacoTheme.done = true;
  monaco.editor.defineTheme("m2-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7d8590", fontStyle: "italic" },
      { token: "string", foreground: "a8e6a1" },
      { token: "string.escape", foreground: "6cb6ff" },
      { token: "number", foreground: "b4d8fd" },
      { token: "keyword", foreground: "f47067" },
      { token: "operator", foreground: "f47067" },
      { token: "type", foreground: "f69d50" },
      { token: "class", foreground: "f69d50" },
      { token: "interface", foreground: "f69d50" },
      { token: "function", foreground: "dcbdfb" },
      { token: "method", foreground: "dcbdfb" },
      { token: "variable", foreground: "e6edf3" },
      { token: "parameter", foreground: "e6edf3" },
      { token: "property", foreground: "e6edf3" },
      { token: "tag", foreground: "8ddb8c" },
      { token: "attribute.name", foreground: "6cb6ff" },
      { token: "delimiter", foreground: "b1bac4" },
      { token: "delimiter.html", foreground: "8ddb8c" },
      { token: "metatag", foreground: "8ddb8c" },
      { token: "attribute.value", foreground: "a8e6a1" },
      { token: "regexp", foreground: "6cb6ff" },
      { token: "annotation", foreground: "dcbdfb" },
      { token: "namespace", foreground: "f69d50" },
      { token: "key", foreground: "6cb6ff" },
      { token: "string.key.json", foreground: "6cb6ff" },
      { token: "type.identifier", foreground: "f69d50" },
      { token: "identifier", foreground: "e6edf3" },
      { token: "constant", foreground: "6cb6ff" },
      { token: "predefined", foreground: "6cb6ff" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#e6edf3",
      "editorCursor.foreground": "#58a6ff",
      "editor.lineHighlightBackground": "#161b22",
      "editor.selectionBackground": "#1f3a5f",
      "editorLineNumber.foreground": "#3b4048",
      "editorLineNumber.activeForeground": "#8b949e",
      "editorGutter.background": "#0d1117",
      "editorWidget.background": "#161b22",
      "editorWidget.border": "#1b1f23",
      "input.background": "#0d1117",
      "input.foreground": "#c9d1d9",
      "input.border": "#30363d",
      "input.placeholderForeground": "#484f58",
      "focusBorder": "#58a6ff",
      "dropdown.background": "#161b22",
      "dropdown.border": "#30363d",
      "dropdown.foreground": "#c9d1d9",
      "list.activeSelectionBackground": "#1f3a5f",
      "list.activeSelectionForeground": "#c9d1d9",
      "list.hoverBackground": "#161b22",
      "list.focusBackground": "#1f3a5f",
      "list.highlightForeground": "#58a6ff",
      "scrollbarSlider.background": "#484f5840",
      "scrollbarSlider.hoverBackground": "#484f5860",
      "scrollbarSlider.activeBackground": "#484f5880",
      "editorIndentGuide.background1": "#1b1f23",
      "editorBracketMatch.background": "#1f3a5f40",
      "editorBracketMatch.border": "#58a6ff80",
      "minimap.background": "#0d1117",
      "peekViewEditor.background": "#0d1117",
      "peekViewResult.background": "#010409",
      "peekView.border": "#58a6ff",
    },
  });
}

function ensureEditor() {
  if (editor || !window.monaco) return editor;
  defineM2MonacoTheme();
  const editorHost = document.querySelector("#monacoEditor");
  editor = monaco.editor.create(editorHost, {
    value: "",
    language: "plaintext",
    theme: editorTheme,
    automaticLayout: true,
    minimap: { enabled: isEditorMinimapEnabled },
    fontSize: 13,
    lineHeight: 21,
    scrollBeyondLastLine: false,
    wordWrap: "on",
    bracketPairColorization: { enabled: true },
    guides: { bracketPairs: true, indentation: true },
    quickSuggestions: true,
    suggestOnTriggerCharacters: true,
  });
  
  editor.addAction({
    id: "ssh-bridge-command-palette",
    label: "Command Palette",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP],
    run: () => openCommandPalette(),
  });
  editor.addAction({
    id: "ssh-bridge-open-file-palette",
    label: "Open File",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP],
    run: () => openCommandPalette("file"),
  });
  editor.addAction({
    id: "ssh-bridge-toggle-theme",
    label: "Toggle Editor Theme",
    run: () => toggleEditorTheme(),
  });
  editor.addAction({
    id: "ssh-bridge-toggle-minimap",
    label: "Toggle Minimap",
    run: () => toggleEditorMinimap(),
  });

  editor.onDidChangeCursorPosition(updateEditorStatusBar);
  editor.onDidChangeCursorSelection(updateEditorStatusBar);
  editor.onDidChangeModelContent(updateEditorStatusBar);
  editor.onDidChangeModel(updateEditorStatusBar);

  new ResizeObserver(() => editor?.layout()).observe(editorHost);
  new ResizeObserver(() => editor?.layout()).observe(document.querySelector("#editorWindow"));
  updateEditorToolbarState();
  updateEditorStatusBar();
  return editor;
}

function renderEditorTabs() {
  editorTabs.innerHTML = "";
  if (editorOpenList) editorOpenList.innerHTML = "";
  openFiles.forEach((file, filePath) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `editor-tab ${filePath === openFilePath ? "active" : ""} ${file.dirty ? "dirty" : ""}`;
    tab.title = filePath;
    const dirtyDot = document.createElement("span");
    dirtyDot.className = "dirty-dot";
    const name = document.createElement("span");
    name.className = "tab-name";
    name.textContent = filePath.split("/").pop() || filePath;
    const close = document.createElement("span");
    close.className = "tab-close";
    close.textContent = "x";
    tab.append(dirtyDot, name, close);
    
    tab.addEventListener("click", (event) => {
      if (event.target === close) closeEditorTab(filePath);
      else switchEditorTab(filePath);
    });

    tab.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      activeTabForContext = filePath;
      
      // Close other context menus
      contextMenu?.classList.add("hidden");
      fileContextMenu?.classList.add("hidden");
      
      // Position and show tab context menu
      tabContextMenu.style.left = `${event.clientX}px`;
      tabContextMenu.style.top = `${event.clientY}px`;
      tabContextMenu.classList.remove("hidden");
    });

    editorTabs.append(tab);

    if (editorOpenList) {
      const sideItem = document.createElement("button");
      sideItem.type = "button";
      sideItem.className = `editor-open-item ${filePath === openFilePath ? "active" : ""} ${file.dirty ? "dirty" : ""}`;
      sideItem.title = filePath;
      sideItem.innerHTML = `<span>${escapeHtml(filePath.split("/").pop() || filePath)}</span><small>${escapeHtml(filePath)}</small>`;
      sideItem.addEventListener("click", () => switchEditorTab(filePath));
      editorOpenList.append(sideItem);
    }
  });
  if (editorOpenList && openFiles.size === 0) {
    const empty = document.createElement("div");
    empty.className = "editor-open-empty";
    empty.textContent = "No open files";
    editorOpenList.append(empty);
  }
  updateEditorWelcome();
}

function updateEditorWelcome() {
  const hasOpenFile = Boolean(openFilePath && editor?.getModel());
  editorWelcome?.classList.toggle("hidden", hasOpenFile);
  document.querySelector("#monacoEditor")?.classList.toggle("hidden", !hasOpenFile);
  if (!hasOpenFile) renderWelcomeRecentFolders();
}

function renderWelcomeRecentFolders() {
  if (!welcomeRecentFolders) return;
  const recent = getRecentEditorFolders();
  welcomeRecentFolders.innerHTML = "";
  if (!recent.length) {
    const empty = document.createElement("div");
    empty.className = "welcome-empty";
    empty.textContent = "No recent folders yet";
    welcomeRecentFolders.append(empty);
    return;
  }
  recent.forEach((folderPath) => {
    const button = document.createElement("button");
    button.type = "button";
    button.title = folderPath;
    button.innerHTML = `<strong>${escapeHtml(folderPath.split("/").filter(Boolean).pop() || folderPath)}</strong><span>${escapeHtml(folderPath)}</span>`;
    button.addEventListener("click", () => openEditorExplorerPath(folderPath));
    welcomeRecentFolders.append(button);
  });
}

function renderEditorExplorer() {
  if (!editorFolderList) return;
  const query = editorExplorerSearch?.value.toLowerCase().trim() || "";
  const sourceItems = editorExplorerItems.length ? editorExplorerItems : allDirectoryItems;
  const items = sourceItems
    .filter((item) => showHiddenFiles || !item.name.startsWith("."))
    .filter((item) => !query || item.name.toLowerCase().includes(query));

  editorFolderPath.textContent = editorExplorerPath || currentPath || "No folder open";
  editorFolderList.innerHTML = "";

  if (!session) {
    const empty = document.createElement("div");
    empty.className = "editor-open-empty";
    empty.textContent = "Connect SSH to browse files";
    editorFolderList.append(empty);
    return;
  }

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "editor-open-empty";
    empty.textContent = query ? "No matching files" : "Folder is empty";
    editorFolderList.append(empty);
    return;
  }

  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `editor-folder-item ${item.type === "dir" ? "folder" : "file"}`;
    button.title = item.name;
    button.innerHTML = `<span>${item.type === "dir" ? "▸" : ""}${escapeHtml(item.name)}</span><small>${item.type === "dir" ? "Folder" : item.size}</small>`;
    button.addEventListener("click", () => {
      const fullPath = joinPath(editorExplorerPath || currentPath || "/", item.name);
      if (item.type === "dir") openEditorExplorerPath(fullPath);
      else openRemoteFile(fullPath);
    });
    editorFolderList.append(button);
  });
}

async function openEditorExplorerPath(path) {
  if (!session) {
    focusWindow("settingsWindow");
    return;
  }
  try {
    const data = await request(`/api/sessions/${session.id}/list?path=${encodeURIComponent(path)}`);
    editorExplorerPath = data.path;
    editorExplorerItems = data.items;
    addRecentEditorFolder(data.path);
    saveActiveSession(currentPath);
    renderEditorExplorer();
  } catch (error) {
    showToast(`Failed to read editor folder: ${error.message}`, "error");
  }
}

function setEditorExplorerWidth(width) {
  if (!editorWorkbench) return;
  const nextWidth = Math.max(140, Math.min(360, Math.round(width)));
  editorWorkbench.style.setProperty("--editor-explorer-width", `${nextWidth}px`);
  localStorage.setItem(savedEditorExplorerWidthKey, String(nextWidth));
  editor?.layout();
}

function initEditorExplorerResize() {
  if (!editorWorkbench || !editorSplitter) return;
  const savedWidth = Number(localStorage.getItem(savedEditorExplorerWidthKey) || 190);
  setEditorExplorerWidth(savedWidth);

  editorSplitter.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = Number(localStorage.getItem(savedEditorExplorerWidthKey) || 190);
    editorSplitter.setPointerCapture(event.pointerId);
    editorWorkbench.classList.add("resizing-explorer");

    const onMove = (moveEvent) => {
      setEditorExplorerWidth(startWidth + moveEvent.clientX - startX);
    };

    const onUp = () => {
      editorWorkbench.classList.remove("resizing-explorer");
      editorSplitter.releasePointerCapture(event.pointerId);
      editorSplitter.removeEventListener("pointermove", onMove);
      editorSplitter.removeEventListener("pointerup", onUp);
    };

    editorSplitter.addEventListener("pointermove", onMove);
    editorSplitter.addEventListener("pointerup", onUp);
  });
}

function updateEditorToolbarState() {
  const labels = { "m2-dark": "M2", "vs-dark": "Dark", vs: "Light" };
  document.querySelector("#editorWindow")?.classList.toggle("editor-theme-m2", editorTheme === "m2-dark");
  if (themeToggleButton) themeToggleButton.textContent = labels[editorTheme] || "Theme";
  if (minimapToggleButton) {
    minimapToggleButton.textContent = isEditorMinimapEnabled ? "Map On" : "Map Off";
    minimapToggleButton.classList.toggle("active", isEditorMinimapEnabled);
  }
}

function toggleEditorTheme() {
  const currentIndex = editorThemes.indexOf(editorTheme);
  editorTheme = editorThemes[(currentIndex + 1) % editorThemes.length];
  localStorage.setItem("sshBridgeEditorTheme", editorTheme);
  defineM2MonacoTheme();
  monaco?.editor?.setTheme(editorTheme);
  updateEditorToolbarState();
}

function toggleEditorMinimap() {
  isEditorMinimapEnabled = !isEditorMinimapEnabled;
  localStorage.setItem("sshBridgeEditorMinimap", String(isEditorMinimapEnabled));
  editor?.updateOptions({ minimap: { enabled: isEditorMinimapEnabled } });
  updateEditorToolbarState();
}

function runEditorCommand(commandId) {
  const activeEditor = ensureEditor();
  const commands = {
    save: () => saveOpenFile(),
    find: () => activeEditor?.getAction("actions.find")?.run(),
    replace: () => activeEditor?.getAction("editor.action.startFindReplaceAction")?.run(),
    format: () => activeEditor?.getAction("editor.action.formatDocument")?.run(),
    theme: () => toggleEditorTheme(),
    minimap: () => toggleEditorMinimap(),
    close: () => openFilePath && closeEditorTab(openFilePath),
  };
  commands[commandId]?.();
}

function getCommandPaletteItems(query = "", mode = "command") {
  const normalized = query.toLowerCase().trim().replace(/^>\s*/, "");
  const commandItems = [
    { label: "Save File", detail: "Ctrl+S", action: () => runEditorCommand("save") },
    { label: "Find", detail: "Ctrl+F", action: () => runEditorCommand("find") },
    { label: "Replace", detail: "Ctrl+H", action: () => runEditorCommand("replace") },
    { label: "Format Document", detail: "Format current model", action: () => runEditorCommand("format") },
    { label: "Cycle Editor Theme", detail: `Current: ${themeToggleButton?.textContent || editorTheme}`, action: () => runEditorCommand("theme") },
    { label: "Toggle Minimap", detail: isEditorMinimapEnabled ? "Hide minimap" : "Show minimap", action: () => runEditorCommand("minimap") },
    { label: "Close Current Tab", detail: openFilePath || "No active file", action: () => runEditorCommand("close") },
  ];
  const fileItems = Array.from(openFiles.keys()).map((filePath) => ({
    label: filePath.split("/").pop() || filePath,
    detail: filePath,
    action: () => switchEditorTab(filePath),
    type: "file",
  }));
  const items = mode === "file" ? fileItems : [...commandItems, ...fileItems];
  return items.filter((item) => {
    const haystack = `${item.label} ${item.detail || ""}`.toLowerCase();
    return !normalized || haystack.includes(normalized);
  });
}

function renderCommandPalette(mode = "command") {
  if (!commandPaletteList || !commandPaletteInput) return;
  const items = getCommandPaletteItems(commandPaletteInput.value, mode).slice(0, 12);
  commandPaletteList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "command-empty";
    empty.textContent = "No matching commands";
    commandPaletteList.append(empty);
    return;
  }
  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `command-item ${index === 0 ? "active" : ""}`;
    button.innerHTML = `<strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.detail || "")}</span>`;
    button.addEventListener("click", () => {
      closeCommandPalette();
      item.action();
    });
    commandPaletteList.append(button);
  });
}

function openCommandPalette(mode = "command") {
  ensureEditor();
  commandPalette?.classList.remove("hidden");
  commandPalette.dataset.mode = mode;
  commandPaletteInput.value = mode === "file" ? "" : ">";
  renderCommandPalette(mode);
  setTimeout(() => {
    commandPaletteInput.focus();
    commandPaletteInput.select();
  }, 20);
}

function closeCommandPalette() {
  commandPalette?.classList.add("hidden");
  editor?.focus();
}

function switchEditorTab(filePath) {
  const file = openFiles.get(filePath);
  const activeEditor = ensureEditor();
  if (!file || !activeEditor) return;
  openFilePath = filePath;
  activeEditor.setModel(file.model);
  openFilePathLabel.textContent = filePath;
  editorStatus.textContent = file.dirty ? "Unsaved changes" : "Loaded";
  saveFileButton.disabled = !file.dirty;
  
  updateEditorStatusBar();
  
  renderEditorTabs();
  updateEditorWelcome();
  setTimeout(() => editor?.layout(), 40);
}

async function closeEditorTab(filePath) {
  const file = openFiles.get(filePath);
  if (!file) return;
  if (file.dirty) {
    const confirmed = await window.osConfirm(`Discard unsaved changes in ${filePath}?`, "Unsaved Changes");
    if (!confirmed) return;
  }
  file.model.dispose();
  openFiles.delete(filePath);
  if (openFilePath === filePath) {
    const nextPath = openFiles.keys().next().value;
    if (nextPath) switchEditorTab(nextPath);
    else {
      openFilePath = "";
      ensureEditor()?.setModel(null);
      openFilePathLabel.textContent = "Open a remote file";
      editorStatus.textContent = "Read/write over SFTP";
      saveFileButton.disabled = true;
      if (editorCursorPos) editorCursorPos.textContent = "Ln 1, Col 1";
      if (editorLanguage) editorLanguage.textContent = "Plain Text";
      renderEditorTabs();
      updateEditorWelcome();
    }
  } else {
    renderEditorTabs();
  }
}

async function openRemoteFile(filePath) {
  if (!session) return;
  focusWindow("editorWindow");
  if (openFiles.has(filePath)) {
    switchEditorTab(filePath);
    return;
  }
  openFilePath = filePath;
  openFilePathLabel.textContent = filePath;
  editorStatus.textContent = "Loading...";

  try {
    const data = await request(`/api/sessions/${session.id}/file?path=${encodeURIComponent(filePath)}`);
    openFilePath = data.path;
    openFilePathLabel.textContent = data.path;
    const activeEditor = ensureEditor();
    const model = monaco.editor.createModel(data.contents, inferLanguage(data.path));
    const fileState = { model, dirty: false };
    model.onDidChangeContent(() => {
      const activeFile = openFiles.get(data.path);
      if (!activeFile || activeFile.dirty) return;
      activeFile.dirty = true;
      editorStatus.textContent = "Unsaved changes";
      saveFileButton.disabled = false;
      renderEditorTabs();
    });
    openFiles.set(data.path, fileState);
    activeEditor.setModel(model);
    updateEditorStatusBar();
    saveFileButton.disabled = true;
    editorStatus.textContent = "Loaded";
    renderEditorTabs();
    updateEditorWelcome();
  } catch (error) {
    editorStatus.textContent = error.message;
  }
}

async function saveOpenFile() {
  const file = openFiles.get(openFilePath);
  if (!session || !openFilePath || !editor || !file) {
    editorStatus.textContent = "Open a file first";
    return;
  }

  editorStatus.textContent = "Saving...";
  try {
    const data = await request(`/api/sessions/${session.id}/file`, {
      method: "PUT",
      body: JSON.stringify({ path: openFilePath, contents: file.model.getValue() }),
    });
    openFilePath = data.path;
    openFilePathLabel.textContent = data.path;
    file.dirty = false;
    editorStatus.textContent = "Saved";
    saveFileButton.disabled = true;
    renderEditorTabs();
  } catch (error) {
    editorStatus.textContent = error.message;
  }
}

async function connect(event) {
  event.preventDefault();
  connectButton.disabled = true;
  setMessage("Connecting...", "");
  setConnectionState("Connecting", "");

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
    terminalCwd = data.path;
    editorExplorerPath = data.path;
    editorExplorerItems = data.items;
    transferPath = data.path;
    setTransferPath(transferPath);
    saveActiveSession(currentPath);
    updateConnectionDetails();
    connectPanel.classList.add("hidden");
    setMessage("Connected", "success");
    showToast(`Successfully connected to ${session.host}`, "success", "SSH Connection");
    const dateStr = new Date().toUTCString();
    const welcomeBanner = `Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-1018-aws x86_64)

 * System Distribution:  ${session.distro || 'GNU/Linux'}
 * Shell Environment:    ${session.shell || '/bin/bash'}
 * Connection Cipher:    ${session.auth || 'publickey'}
 * Port:                 ${payload.port}

 System information as of ${dateStr}

   System load:  0.05               Processes:             108
   Usage of /:   12.4% of 32GB      Users logged in:       1
   Memory usage: 18%                IPv4 address:          ${session.host}
   Swap usage:   0%

 Last login: ${new Date(Date.now() - 3600000).toUTCString()} from local-bridge-tunnel
`;
    command(`ssh ${session.username}@${session.host}`, welcomeBanner);
    renderFiles(data.items, true);
    startHealthChecks();
    focusWindow("filesWindow");
  } catch (error) {
    session = null;
    updateConnectionDetails();
    setMessage(error.message, "error");
    showToast(`SSH Connection failed: ${error.message}`, "error", "SSH Connection");
    command("ssh handshake", error.message);
  } finally {
    connectButton.disabled = false;
  }
}

async function disconnectSession() {
  const oldSession = session;
  if (oldSession) {
    try {
      await request(`/api/sessions/${oldSession.id}/disconnect`, { method: "POST" });
    } catch {
      // The local UI still needs to leave the connected state.
    }
  }
  stopHealthChecks();
  session = null;
  clearActiveSession();
  currentPath = "";
  terminalCwd = "";
  editorExplorerPath = "";
  editorExplorerItems = [];
  transferPath = "";
  if (uploadDestPath) uploadDestPath.textContent = "/";
  selected.clear();
  updateConnectionDetails();
  renderFiles([], true);
  setMessage("Disconnected", "");
  showToast("Successfully disconnected from remote host", "info", "SSH Disconnection");
  command("disconnect", "SSH session closed");
}

async function restoreActiveSession() {
  const saved = loadActiveSession();
  if (!saved) return false;

  const savedPath = saved.path || saved.session.startPath || ".";
  session = saved.session;
  currentPath = savedPath;
  terminalCwd = saved.terminalCwd || saved.session.startPath || savedPath;
  editorExplorerPath = saved.editorExplorerPath || savedPath;
  transferPath = saved.transferPath || savedPath;
  setTransferPath(transferPath);
  setConnectionState("Restoring", "");
  setMessage("Restoring active SSH session...", "");
  updateConnectionDetails();

  try {
    const data = await request(`/api/sessions/${session.id}?path=${encodeURIComponent(savedPath)}`, {
      skipSessionExpiryHandler: true,
    });
    session = data.session;
    currentPath = data.path;
    terminalCwd = saved.terminalCwd || session.startPath || data.path;
    editorExplorerPath = saved.editorExplorerPath || data.path;
    editorExplorerItems = data.items;
    transferPath = saved.transferPath || data.path;
    setTransferPath(transferPath);
    saveActiveSession(currentPath);
    updateConnectionDetails();
    renderFiles(data.items, true);
    setMessage("Connected", "success");
    connectPanel.classList.add("hidden");
    startHealthChecks();
    command(`restore ${session.username}@${session.host}`, `Reused active SSH session at ${currentPath}`);
    if (data.warning) {
      showToast(data.warning, "info", "Session Restored");
      command("restore folder", data.warning);
    }
    return true;
  } catch (error) {
    command("restore session", error.message);
    const reconnected = await reconnectFromSavedConnection(savedPath, error);
    if (reconnected) return true;

    clearActiveSession();
    session = null;
    currentPath = "";
    terminalCwd = "";
    editorExplorerPath = "";
    editorExplorerItems = [];
    transferPath = "";
    if (uploadDestPath) uploadDestPath.textContent = "/";
    updateConnectionDetails();
    renderFiles([], true);
    const reason = error.status === 404
      ? "The local server no longer has that SSH session. This usually means the Node server restarted."
      : error.message;
    setMessage(`Could not restore SSH session. ${reason}`, "error");
    return false;
  }
}

async function reconnectFromSavedConnection(pathToOpen = ".", restoreError = null) {
  const savedConnection = getSavedConnectionValues();
  if (!savedConnection?.host || !savedConnection?.username || !savedConnection?.privateKey) {
    return false;
  }

  setConnectionState("Reconnecting", "");
  setMessage("Session was not reusable. Reconnecting with saved key...", "");

  const payload = {
    host: savedConnection.host,
    username: savedConnection.username,
    port: Number(savedConnection.port || 22),
    startPath: pathToOpen || savedConnection.startPath || ".",
    privateKey: savedConnection.privateKey,
    passphrase: document.querySelector("#passphrase")?.value || "",
  };

  try {
    const data = await request("/api/connect", {
      method: "POST",
      body: JSON.stringify(payload),
      skipSessionExpiryHandler: true,
    });
    session = data.session;
    currentPath = data.path;
    terminalCwd = data.path;
    editorExplorerPath = data.path;
    editorExplorerItems = data.items;
    transferPath = data.path;
    setTransferPath(transferPath);
    saveActiveSession(currentPath);
    updateConnectionDetails();
    renderFiles(data.items, true);
    setMessage("Connected", "success");
    connectPanel.classList.add("hidden");
    startHealthChecks();
    command(
      `reconnect ${session.username}@${session.host}`,
      restoreError ? `Previous session could not be reused: ${restoreError.message}` : "Connected with saved key",
    );
    showToast("SSH session reconnected with the saved key.", "info", "Session Restored");
    return true;
  } catch (error) {
    command("reconnect", error.message);
    return false;
  }
}

function addTransferQueue(name, direction) {
  const id = "tx-" + Math.random().toString(36).substring(2, 9);
  const item = document.createElement("article");
  item.className = "transfer-item";
  item.id = id;
  
  item.innerHTML = `
    <strong>${escapeHtml(name)}</strong>
    <span>${direction} queueing...</span>
    <div class="progress"><i style="width: 0%;"></i></div>
    <div class="transfer-item-meta">
      <span class="transfer-speed">Pending...</span>
      <button class="transfer-cancel-btn" type="button">Cancel</button>
    </div>
  `;
  
  const cancelBtn = item.querySelector(".transfer-cancel-btn");
  cancelBtn.addEventListener("click", () => {
    item.remove();
    showToast(`Cancelled transfer of "${name}"`, "info");
  });

  transferList.prepend(item);
  return id;
}

function updateTransferProgress(id, percentage, status, isFailed = false) {
  const item = document.getElementById(id);
  if (!item) return;
  
  const progress = item.querySelector(".progress i");
  const text = item.querySelector("span");
  const speed = item.querySelector(".transfer-speed");
  
  if (progress) progress.style.width = `${percentage}%`;
  if (text) text.textContent = status;
  if (speed) {
    if (isFailed) {
      speed.textContent = "Failed";
      speed.style.color = "#ef5f57";
    } else if (percentage === 100) {
      speed.textContent = "Finished";
      speed.style.color = "#10b981";
    } else {
      speed.textContent = `${percentage}%`;
    }
  }
  
  if (isFailed || percentage === 100) {
    const cancel = item.querySelector(".transfer-cancel-btn");
    if (cancel) cancel.remove();
  }
}

async function copySelected() {
  if (!session) {
    showToast("Connect to SSH first", "info");
    return;
  }
  const items = getSelectedItems();
  if (items.length === 0) {
    showToast("Select a file in Explorer to download first", "info");
    return;
  }
  
  focusWindow("transferWindow");

  for (const item of items) {
    if (item.type === "dir") {
      showToast(`Folder download is not supported. Choose a file instead.`, "error");
      continue;
    }
    
    const remotePath = joinPath(currentPath, item.name);
    const transferId = addTransferQueue(item.name, "Download");
    
    try {
      updateTransferProgress(transferId, 0, "Starting download...");
      
      const downloadUrl = `/api/sessions/${session.id}/download?path=${encodeURIComponent(remotePath)}`;
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
      
      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      const reader = response.body.getReader();
      const chunks = [];
      let receivedLength = 0;
      
      const formatBytes = (bytes) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        if (total > 0) {
          const percent = Math.min(99, Math.round((receivedLength / total) * 100));
          updateTransferProgress(transferId, percent, `Downloading... (${percent}%)`);
        } else {
          updateTransferProgress(transferId, 30, `Downloading... (${formatBytes(receivedLength)})`);
        }
      }
      
      updateTransferProgress(transferId, 99, "Saving file...");
      
      const blob = new Blob(chunks, { type: "application/octet-stream" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      
      updateTransferProgress(transferId, 100, "Completed");
      showToast(`Successfully downloaded "${item.name}"`, "success");
    } catch (err) {
      updateTransferProgress(transferId, 100, "Failed", true);
      showToast(`Download failed for "${item.name}": ${err.message}`, "error");
    }
  }

  selected.clear();
  renderFiles();
}

document.querySelector("#refreshButton").addEventListener("click", () => openPath(currentPath || "."));
openFileButton.addEventListener("click", openSelectedItem);
newFileButton.addEventListener("click", () => createFile("file"));
newFolderButton.addEventListener("click", () => createFile("dir"));
renameButton.addEventListener("click", renameSelectedItem);
deleteButton.addEventListener("click", deleteSelectedItem);
uploadButton.addEventListener("click", () => {
  localFilePicker?.click();
  focusWindow("transferWindow");
});
document.querySelector("#copySelectedButton").addEventListener("click", copySelected);
saveFileButton.addEventListener("click", saveOpenFile);
disconnectButton.addEventListener("click", disconnectSession);
closeConnectButton.addEventListener("click", () => {
  connectPanel.classList.add("hidden");
  cancelAutoConnect();
});

["#sshHost", "#sshUser", "#sshPort", "#sshStartPath", "#privateKey"].forEach((selector) => {
  const el = document.querySelector(selector);
  if (!el) return;
  el.addEventListener("input", () => {
    saveConnectionValues(collectConnectionValues());
    cancelAutoConnect();
  });
  el.addEventListener("focus", cancelAutoConnect);
});

const passphraseEl = document.querySelector("#passphrase");
if (passphraseEl) {
  passphraseEl.addEventListener("input", cancelAutoConnect);
  passphraseEl.addEventListener("focus", cancelAutoConnect);
}

document.querySelector(".advanced-settings")?.addEventListener("click", cancelAutoConnect);
// document.querySelector("#clearLogButton").addEventListener("click", () => {
//   logLines.length = 0;
//   renderTerminalLog();
// });
terminalInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    runTerminalCommand();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    commandHistoryIndex = Math.max(0, commandHistoryIndex - 1);
    terminalInput.value = commandHistory[commandHistoryIndex] || "";
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    commandHistoryIndex = Math.min(commandHistory.length, commandHistoryIndex + 1);
    terminalInput.value = commandHistory[commandHistoryIndex] || "";
  } else if (event.ctrlKey && event.key.toLowerCase() === "l") {
    event.preventDefault();
    logLines.length = 0;
    renderTerminalLog();
  } else if (event.ctrlKey && event.key.toLowerCase() === "c") {
    event.preventDefault();
    pushTerminal("^C", "stdout");
    terminalInput.value = "";
    commandHistoryIndex = commandHistory.length;
  } else if (event.key === "Tab") {
    event.preventDefault();
    const inputVal = terminalInput.value;
    const words = inputVal.split(" ");
    const lastWord = words[words.length - 1];
    if (!lastWord) return;

    const matches = allDirectoryItems
      .map(item => item.name)
      .filter(name => name.startsWith(lastWord));

    if (matches.length === 1) {
      words[words.length - 1] = matches[0];
      terminalInput.value = words.join(" ");
    } else if (matches.length > 1) {
      pushTerminal("");
      pushTerminal(matches.join("   "), "stdout");
      const promptPath = terminalCwd || session?.startPath || "~";
      const promptText = session ? `${session.username}@${session.host}:${promptPath} $` : "local $";
      pushTerminal(`${promptText} ${inputVal}`, "command");
    }
  }
});
terminalBody?.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  focusTerminalInputAtBottom();
});
document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => {
    terminalInput.value = button.dataset.command;
    focusWindow("terminalWindow");
    terminalInput.focus();
  });
});

terminalSearch?.addEventListener("input", () => {
  const query = terminalSearch.value.toLowerCase().trim();
  if (query) {
    const filtered = logLines.filter(line => line.text.toLowerCase().includes(query));
    renderTerminalLog(filtered, query);
  } else {
    renderTerminalLog();
  }
});

function isAppSwitcherShortcut(event) {
  const isBackquote = event.code === "Backquote" || event.key === "`" || event.key === "~";
  const isBestEffortAltTab = event.altKey && event.key === "Tab";
  return ((event.altKey || event.ctrlKey) && isBackquote) || isBestEffortAltTab;
}

document.addEventListener("keydown", (event) => {
  if (isAppSwitcherShortcut(event)) {
    event.preventDefault();
    altTabCloseKey = event.ctrlKey ? "Control" : "Alt";
    openAltTabSwitcher(event.shiftKey ? -1 : 1);
  } else if (isAltTabOpen && (event.key === "ArrowRight" || event.key === "ArrowDown")) {
    event.preventDefault();
    openAltTabSwitcher(1);
  } else if (isAltTabOpen && (event.key === "ArrowLeft" || event.key === "ArrowUp")) {
    event.preventDefault();
    openAltTabSwitcher(-1);
  } else if (event.key === "Escape") {
    if (isAltTabOpen) closeAltTabSwitcher(false);
    closeStartMenu();
    if (!commandPalette?.classList.contains("hidden")) closeCommandPalette();
    connectPanel.classList.add("hidden");
  } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p") {
    event.preventDefault();
    focusWindow("editorWindow");
    openCommandPalette();
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
    event.preventDefault();
    focusWindow("editorWindow");
    openCommandPalette("file");
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f" && document.querySelector(".focused")?.id === "editorWindow") {
    event.preventDefault();
    runEditorCommand("find");
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "h" && document.querySelector(".focused")?.id === "editorWindow") {
    event.preventDefault();
    runEditorCommand("replace");
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key === altTabCloseKey || event.key === "Alt" || event.key === "Control") closeAltTabSwitcher(true);
});
connectForm.addEventListener("submit", connect);
pemFile.addEventListener("change", async () => {
  const [file] = pemFile.files;
  if (!file) return;
  privateKey.value = await file.text();
  const nameLabel = document.querySelector("#pemFileName");
  if (nameLabel) nameLabel.textContent = file.name;
  setMessage(`${file.name} loaded`, "success");
  saveConnectionValues(collectConnectionValues());
  cancelAutoConnect();
});

document.querySelector("#pemFile")?.addEventListener("click", cancelAutoConnect);
document.querySelector("#stopAutoConnectBtn")?.addEventListener("click", cancelAutoConnect);

document.querySelector("#toggleKeyTextarea")?.addEventListener("click", () => {
  document.querySelector("#textareaContainer")?.classList.toggle("hidden");
  cancelAutoConnect();
});
document.querySelectorAll(".file-menu").forEach((menu) => {
  menu.addEventListener("toggle", () => {
    if (!menu.open) return;
    document.querySelectorAll(".file-menu").forEach((otherMenu) => {
      if (otherMenu !== menu) otherMenu.removeAttribute("open");
    });
  });
});
document.addEventListener("click", (event) => {
  if (event.target.closest(".file-menu")) return;
  document.querySelectorAll(".file-menu").forEach((menu) => menu.removeAttribute("open"));
});
animationToggle?.addEventListener("change", () => {
  setAnimationEnabled(animationToggle.checked);
  showToast(
    animationToggle.checked ? "Window animations enabled" : "Window animations disabled",
    "info",
    "Appearance",
  );
});
commandPaletteButton?.addEventListener("click", () => openCommandPalette());
findReplaceButton?.addEventListener("click", () => runEditorCommand("replace"));
themeToggleButton?.addEventListener("click", toggleEditorTheme);
minimapToggleButton?.addEventListener("click", toggleEditorMinimap);
welcomeOpenFolderButton?.addEventListener("click", async () => {
  if (!session) {
    focusWindow("settingsWindow");
    return;
  }
  const nextPath = await window.osPrompt("Remote folder path", editorExplorerPath || currentPath || session.startPath || ".", "Open Remote Folder");
  if (nextPath) openEditorExplorerPath(nextPath);
});
welcomeOpenFilesButton?.addEventListener("click", () => focusWindow("filesWindow"));
welcomeCommandButton?.addEventListener("click", () => openCommandPalette());
transferUseFilesPath?.addEventListener("click", () => setTransferPath(currentPath || session?.startPath || "."));
transferUseEditorPath?.addEventListener("click", () => setTransferPath(editorExplorerPath || currentPath || session?.startPath || "."));
transferChoosePath?.addEventListener("click", async () => {
  const nextPath = await window.osPrompt("Upload destination path", transferPath || session?.startPath || ".", "Transfer Path");
  if (nextPath) setTransferPath(nextPath);
});
editorExplorerSearch?.addEventListener("input", renderEditorExplorer);
editorRefreshExplorerButton?.addEventListener("click", () => openEditorExplorerPath(editorExplorerPath || currentPath || "."));
editorNewFileButton?.addEventListener("click", async () => {
  const name = await window.osPrompt("New file name", "untitled.txt", "New File");
  if (!name) return;
  await runFileAction("new-file", { path: editorExplorerPath || currentPath || session?.startPath || ".", name, updateFileExplorer: false });
  await openEditorExplorerPath(editorExplorerPath || currentPath || ".");
});
editorNewFolderButton?.addEventListener("click", async () => {
  const name = await window.osPrompt("New folder name", "new-folder", "New Folder");
  if (!name) return;
  await runFileAction("new-folder", { path: editorExplorerPath || currentPath || session?.startPath || ".", name, updateFileExplorer: false });
  await openEditorExplorerPath(editorExplorerPath || currentPath || ".");
});
editorCloseAllButton?.addEventListener("click", async () => {
  for (const filePath of Array.from(openFiles.keys())) {
    await closeEditorTab(filePath);
  }
});
commandPalette?.addEventListener("click", (event) => {
  if (event.target === commandPalette) closeCommandPalette();
});
commandPaletteInput?.addEventListener("input", () => {
  renderCommandPalette(commandPalette?.dataset.mode || "command");
});
commandPaletteInput?.addEventListener("keydown", (event) => {
  const items = Array.from(commandPaletteList?.querySelectorAll(".command-item") || []);
  const activeIndex = Math.max(0, items.findIndex((item) => item.classList.contains("active")));
  if (event.key === "Escape") {
    event.preventDefault();
    closeCommandPalette();
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (!items.length) return;
    items[activeIndex]?.classList.remove("active");
    const nextIndex = event.key === "ArrowDown"
      ? (activeIndex + 1) % items.length
      : (activeIndex - 1 + items.length) % items.length;
    items[nextIndex].classList.add("active");
    items[nextIndex].scrollIntoView({ block: "nearest" });
  } else if (event.key === "Enter") {
    event.preventDefault();
    items[activeIndex]?.click();
  }
});

function applyAnimationSetting() {
  document.documentElement.classList.toggle("animations-disabled", !isAnimationEnabled);
  if (animationToggle) animationToggle.checked = isAnimationEnabled;
}

function setAnimationEnabled(enabled) {
  isAnimationEnabled = Boolean(enabled);
  localStorage.setItem(savedAnimationKey, String(isAnimationEnabled));
  applyAnimationSetting();
}

function animateWindow(windowEl, type) {
  if (!isAnimationEnabled || !windowEl) return Promise.resolve();
  const taskButton = document.querySelector(`[data-window="${windowEl.id}"]`);
  const windowRect = windowEl.getBoundingClientRect();
  const taskRect = taskButton?.getBoundingClientRect();
  const minimizeX = taskRect ? taskRect.left + taskRect.width / 2 - (windowRect.left + windowRect.width / 2) : 0;
  const minimizeY = taskRect ? taskRect.top + taskRect.height / 2 - (windowRect.top + windowRect.height / 2) : 54;

  const gsapAnimations = {
    open: {
      from: { autoAlpha: 0, y: 24, scale: 0.95, filter: "blur(5px)", transformOrigin: "50% 100%" },
      to: { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.28, ease: "power3.out" },
    },
    focus: {
      from: { y: 0, scale: 0.992, filter: "brightness(1.02)" },
      to: { y: -1, scale: 1, filter: "brightness(1)", duration: 0.18, ease: "power2.out" },
    },
    minimize: {
      from: { autoAlpha: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)", transformOrigin: "50% 100%" },
      to: { autoAlpha: 0, x: minimizeX, y: minimizeY, scale: 0.72, filter: "blur(4px)", duration: 0.3, ease: "power3.inOut" },
    },
    close: {
      from: { autoAlpha: 1, scale: 1, filter: "blur(0px)" },
      to: { autoAlpha: 0, scale: 0.95, y: 8, filter: "blur(5px)", duration: 0.18, ease: "power2.in" },
    },
    maximize: {
      from: { scale: 0.975, filter: "blur(2px)", transformOrigin: "50% 50%" },
      to: { scale: 1, filter: "blur(0px)", duration: 0.22, ease: "power3.out" },
    },
  };

  const gsapConfig = gsapAnimations[type];
  if (window.gsap && gsapConfig) {
    window.gsap.killTweensOf(windowEl);
    return new Promise((resolve) => {
      window.gsap.fromTo(windowEl, gsapConfig.from, {
        ...gsapConfig.to,
        clearProps: type === "minimize" || type === "close" ? "transform,filter" : "transform,filter,opacity,visibility",
        onComplete: resolve,
      });
    });
  }

  if (!windowEl.animate) return Promise.resolve();
  windowEl.getAnimations().forEach((animation) => animation.cancel());

  const common = {
    duration: 260,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    fill: "both",
  };
  const fallbackAnimations = {
    open: {
      keyframes: [
        { opacity: 0, transform: "translate3d(0, 24px, 0) scale(0.95)", filter: "blur(5px)" },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", filter: "blur(0)" },
      ],
      options: { ...common, duration: 280 },
    },
    focus: {
      keyframes: [
        { transform: "translate3d(0, 0, 0) scale(0.992)", filter: "brightness(1.02)" },
        { transform: "translate3d(0, -1px, 0) scale(1)", filter: "brightness(1)" },
      ],
      options: { ...common, duration: 180 },
    },
    minimize: {
      keyframes: [
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", filter: "blur(0)" },
        { opacity: 0, transform: `translate3d(${minimizeX}px, ${minimizeY}px, 0) scale(0.72)`, filter: "blur(4px)" },
      ],
      options: { ...common, duration: 300 },
    },
    close: {
      keyframes: [
        { opacity: 1, transform: "scale(1)", filter: "blur(0)" },
        { opacity: 0, transform: "translate3d(0, 8px, 0) scale(0.95)", filter: "blur(5px)" },
      ],
      options: { ...common, duration: 180 },
    },
    maximize: {
      keyframes: [
        { transform: "scale(0.975)", filter: "blur(2px)" },
        { transform: "scale(1)", filter: "blur(0)" },
      ],
      options: { ...common, duration: 220 },
    },
  };
  const config = fallbackAnimations[type];
  if (!config) return Promise.resolve();
  const animation = windowEl.animate(config.keyframes, config.options);
  return animation.finished.catch(() => {});
}

const appLaunchMeta = {
  filesWindow: {
    name: "Files",
    detail: "Remote explorer",
    iconClass: "launcher-files",
    iconText: "Files",
    previewClass: "files",
  },
  terminalWindow: {
    name: "Terminal",
    detail: "SSH shell",
    iconClass: "launcher-terminal",
    iconText: "Term",
    previewClass: "terminal",
  },
  editorWindow: {
    name: "Editor",
    detail: "Monaco workspace",
    iconClass: "launcher-editor",
    iconText: "Edit",
    previewClass: "editor",
  },
  transferWindow: {
    name: "Transfers",
    detail: "File transfers",
    iconClass: "launcher-transfer",
    iconText: "Move",
    previewClass: "transfer",
  },
  settingsWindow: {
    name: "Connection",
    detail: "SSH settings",
    iconClass: "launcher-editor",
    iconText: "SSH",
    previewClass: "settings",
  },
};

function loadRecentApps() {
  try {
    const parsed = JSON.parse(localStorage.getItem(savedRecentAppsKey) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => typeof entry === "string" ? { id: entry, usedAt: Date.now() } : entry)
      .filter((entry) => entry && appLaunchMeta[entry.id]);
  } catch {
    return [];
  }
}

function saveRecentApps(apps) {
  localStorage.setItem(savedRecentAppsKey, JSON.stringify(apps.slice(0, 5)));
}

function formatRecentAppTime(timestamp) {
  const date = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderRecentApps() {
  if (!desktopRecentApps) return;
  const recentApps = loadRecentApps();
  desktopRecentApps.innerHTML = "";

  if (!recentApps.length) {
    ["filesWindow", "terminalWindow", "editorWindow"].forEach((id) => {
      if (!appLaunchMeta[id]) return;
      recentApps.push({ id, usedAt: Date.now() });
    });
  }

  recentApps.slice(0, 4).forEach(({ id, usedAt }) => {
    const meta = appLaunchMeta[id];
    const button = document.createElement("button");
    button.className = "launcher-recent-item";
    button.type = "button";
    button.dataset.launchWindow = id;
    button.title = `Open ${meta.name}`;
    button.innerHTML = `
      <span class="launcher-icon ${meta.iconClass}">${escapeHtml(meta.iconText)}</span>
      <span class="launcher-recent-copy">
        <strong>${escapeHtml(meta.name)}</strong>
        <small>${escapeHtml(meta.detail)}</small>
      </span>
      <span class="launcher-recent-time">${formatRecentAppTime(usedAt)}</span>
    `;
    desktopRecentApps.append(button);
  });
}

function rememberRecentApp(id) {
  if (!appLaunchMeta[id]) return;
  const recentApps = loadRecentApps().filter((app) => app.id !== id);
  recentApps.unshift({ id, usedAt: Date.now() });
  saveRecentApps(recentApps);
  renderRecentApps();
}

function openStartMenu() {
  if (!startMenuPanel || !session) return;
  renderRecentApps();
  startMenuPanel.classList.remove("hidden");
  startMenuPanel.setAttribute("aria-hidden", "false");
  if (isAnimationEnabled && window.gsap) {
    window.gsap.killTweensOf(startMenuPanel);
    window.gsap.fromTo(
      startMenuPanel,
      { autoAlpha: 0, filter: "blur(7px)" },
      { autoAlpha: 1, filter: "blur(0px)", duration: 0.22, ease: "power3.out" },
    );
    window.gsap.fromTo(
      startMenuPanel.querySelectorAll(".launcher-app, .launcher-recent-item, .start-account-pane"),
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.2, stagger: 0.025, ease: "power2.out" },
    );
  }
}

function closeStartMenu(animate = true) {
  if (!startMenuPanel || startMenuPanel.classList.contains("hidden")) return;
  const finish = () => {
    startMenuPanel.classList.add("hidden");
    startMenuPanel.setAttribute("aria-hidden", "true");
    startMenuPanel.style.opacity = "";
    startMenuPanel.style.visibility = "";
    startMenuPanel.style.transform = "";
    startMenuPanel.style.filter = "";
  };

  if (animate && isAnimationEnabled && window.gsap) {
    window.gsap.killTweensOf(startMenuPanel);
    window.gsap.to(startMenuPanel, {
      autoAlpha: 0,
      filter: "blur(4px)",
      duration: 0.14,
      ease: "power2.in",
      onComplete: finish,
    });
    return;
  }

  finish();
}

function toggleStartMenu() {
  if (!session) {
    closeStartMenu(false);
    connectPanel.classList.toggle("hidden");
    return;
  }
  if (startMenuPanel?.classList.contains("hidden")) openStartMenu();
  else closeStartMenu();
}

function getAltTabWindows() {
  return [...windows]
    .filter((windowEl) => (
      appLaunchMeta[windowEl.id]
      && launchedWindowIds.has(windowEl.id)
      && !windowEl.classList.contains("closed")
    ))
    .sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0));
}

function renderAltTabItems() {
  if (!altTabList) return;
  altTabList.innerHTML = "";

  altTabItems.forEach((windowEl, index) => {
    const meta = appLaunchMeta[windowEl.id];
    const button = document.createElement("button");
    button.className = "alt-tab-item";
    button.type = "button";
    button.dataset.altTabIndex = String(index);
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === altTabIndex));
    button.innerHTML = `
      <span class="alt-tab-preview ${meta.previewClass || ""}">
        <span class="launcher-icon ${meta.iconClass}">${escapeHtml(meta.iconText)}</span>
        <span class="alt-tab-preview-title">${escapeHtml(meta.name)}</span>
      </span>
      <span class="alt-tab-meta">
        <strong>${escapeHtml(meta.name)}</strong>
        <small>${windowEl.classList.contains("minimized") ? "Minimized" : escapeHtml(meta.detail)}</small>
      </span>
    `;
    altTabList.append(button);
  });
}

function animateAltTabOpen() {
  if (!isAnimationEnabled || !window.gsap || !altTabOverlay) return;
  const switcher = altTabOverlay.querySelector(".alt-tab-switcher");
  window.gsap.killTweensOf([altTabOverlay, switcher, ".alt-tab-item"]);
  window.gsap.fromTo(altTabOverlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: "power2.out" });
  window.gsap.fromTo(
    switcher,
    { y: 18, scale: 0.965, filter: "blur(6px)" },
    { y: 0, scale: 1, filter: "blur(0px)", duration: 0.24, ease: "power3.out" },
  );
  window.gsap.fromTo(
    altTabList?.querySelectorAll(".alt-tab-item") || [],
    { y: 10, autoAlpha: 0, scale: 0.96 },
    { y: 0, autoAlpha: 1, scale: 1, duration: 0.22, stagger: 0.035, ease: "power3.out" },
  );
}

function animateAltTabSelection() {
  if (!isAnimationEnabled || !window.gsap || !altTabList) return;
  const active = altTabList.querySelector(".alt-tab-item.active");
  if (!active) return;
  window.gsap.killTweensOf(active);
  window.gsap.fromTo(active, { scale: 0.97, y: 2 }, { scale: 1, y: 0, duration: 0.18, ease: "back.out(1.8)" });
}

function updateAltTabSelection() {
  if (!altTabList) return;
  windows.forEach((windowEl) => {
    windowEl.classList.toggle("alt-tab-target", windowEl === altTabItems[altTabIndex]);
  });
  altTabList.querySelectorAll(".alt-tab-item").forEach((item, index) => {
    const active = index === altTabIndex;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", String(active));
    if (active) item.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  animateAltTabSelection();
}

function openAltTabSwitcher(direction = 1) {
  if (!altTabOverlay || !altTabList) return;
  altTabItems = getAltTabWindows();
  if (!altTabItems.length) return;

  const focusedIndex = altTabItems.findIndex((windowEl) => windowEl.classList.contains("focused"));
  if (!isAltTabOpen) {
    isAltTabOpen = true;
    altTabIndex = focusedIndex >= 0 ? focusedIndex : 0;
    altTabOverlay.classList.remove("hidden");
    altTabOverlay.style.opacity = "";
    altTabOverlay.style.visibility = "";
    altTabOverlay.setAttribute("aria-hidden", "false");
    renderAltTabItems();
    animateAltTabOpen();
  }

  altTabIndex = (altTabIndex + direction + altTabItems.length) % altTabItems.length;
  updateAltTabSelection();
}

function closeAltTabSwitcher(shouldFocus = true) {
  if (!isAltTabOpen || !altTabOverlay) return;
  const selectedWindow = altTabItems[altTabIndex];

  const finish = () => {
    altTabOverlay.style.opacity = "";
    altTabOverlay.style.visibility = "";
    altTabOverlay.classList.add("hidden");
    altTabOverlay.setAttribute("aria-hidden", "true");
    windows.forEach((windowEl) => windowEl.classList.remove("alt-tab-target"));
    isAltTabOpen = false;
    altTabItems = [];
    altTabIndex = 0;
    if (shouldFocus && selectedWindow) focusWindow(selectedWindow.id);
  };

  if (isAnimationEnabled && window.gsap) {
    const switcher = altTabOverlay.querySelector(".alt-tab-switcher");
    window.gsap.to(switcher, { y: 10, scale: 0.97, filter: "blur(5px)", duration: 0.12, ease: "power2.in" });
    window.gsap.to(altTabOverlay, { autoAlpha: 0, duration: 0.14, ease: "power2.in", onComplete: finish });
    return;
  }

  finish();
}

function focusWindow(id) {
  const targetWindow = document.querySelector(`#${id}`);
  if (!targetWindow) return;
  if (appLaunchMeta[id]) launchedWindowIds.add(id);
  const wasHidden = targetWindow.classList.contains("minimized") || targetWindow.classList.contains("closed");
  const wasFocused = targetWindow.classList.contains("focused");

  // Close context menu on focus/clicks
  document.querySelector("#taskbarContextMenu")?.classList.add("hidden");

  targetWindow.classList.remove("minimized", "closed");
  
  // Set incremental Z-index for active window stacking
  topZIndex++;
  targetWindow.style.zIndex = topZIndex;

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
  if (wasHidden || !wasFocused) animateWindow(targetWindow, wasHidden ? "open" : "focus");
  rememberRecentApp(id);
  if (id === "editorWindow") setTimeout(() => editor?.layout(), 80);
}

async function minimizeWindow(id) {
  const targetWindow = document.querySelector(`#${id}`);
  if (!targetWindow) return;

  await animateWindow(targetWindow, "minimize");
  targetWindow.classList.add("minimized");
  targetWindow.classList.remove("focused");
  taskApps.forEach((button) => {
    button.classList.toggle("active", false);
    button.classList.toggle("minimized", button.dataset.window === id);
  });

  const visibleWindow = [...windows].find((windowEl) => !windowEl.classList.contains("closed") && !windowEl.classList.contains("minimized"));
  if (visibleWindow) focusWindow(visibleWindow.id);
  persistWindowLayout();
}

async function closeWindow(id) {
  const targetWindow = document.querySelector(`#${id}`);
  if (!targetWindow) return;
  if (id === "editorWindow" && [...openFiles.values()].some((file) => file.dirty)) {
    const confirmed = await window.osConfirm("Close editor and discard unsaved changes?", "Close Editor");
    if (!confirmed) return;
  }
  await animateWindow(targetWindow, "close");
  targetWindow.classList.add("closed");
  launchedWindowIds.delete(id);
  targetWindow.classList.remove("focused", "maximized");
  taskApps.forEach((button) => {
    button.classList.toggle("closed", button.dataset.window === id);
    button.classList.toggle("active", false);
  });
  const visibleWindow = [...windows].find((windowEl) => !windowEl.classList.contains("closed") && !windowEl.classList.contains("minimized"));
  if (visibleWindow) focusWindow(visibleWindow.id);
  persistWindowLayout();
}

function maximizeWindow(id) {
  const targetWindow = document.querySelector(`#${id}`);
  if (!targetWindow) return;
  targetWindow.classList.remove("minimized", "closed");

  const isMaximized = targetWindow.classList.contains("maximized");
  if (!isMaximized) {
    // Maximizing: Save current bounds before style clears
    preMaximizedBounds.set(id, {
      left: targetWindow.style.left,
      top: targetWindow.style.top,
      width: targetWindow.style.width,
      height: targetWindow.style.height
    });
    targetWindow.classList.add("maximized");
    targetWindow.style.left = "";
    targetWindow.style.top = "";
    targetWindow.style.width = "";
    targetWindow.style.height = "";
  } else {
    // Restoring: Retrieve and restore bounds
    targetWindow.classList.remove("maximized");
    const bounds = preMaximizedBounds.get(id);
    if (bounds) {
      targetWindow.style.left = bounds.left;
      targetWindow.style.top = bounds.top;
      targetWindow.style.width = bounds.width;
      targetWindow.style.height = bounds.height;
    }
  }

  focusWindow(id);
  animateWindow(targetWindow, "maximize");
  if (id === "editorWindow") setTimeout(() => editor?.layout(), 80);
  persistWindowLayout();
}

function persistWindowLayout() {
  const layout = {};
  windows.forEach((windowEl) => {
    layout[windowEl.id] = {
      className: windowEl.className,
      left: windowEl.style.left,
      top: windowEl.style.top,
      right: windowEl.style.right,
      bottom: windowEl.style.bottom,
      width: windowEl.style.width,
      height: windowEl.style.height,
    };
  });
  localStorage.setItem(savedLayoutKey, JSON.stringify(layout));
}

function applySavedLayout() {
  const raw = localStorage.getItem(savedLayoutKey);
  if (!raw) return;
  try {
    const layout = JSON.parse(raw);
    windows.forEach((windowEl) => {
      const saved = layout[windowEl.id];
      if (!saved) return;
      windowEl.className = saved.className || windowEl.className;
      ["left", "top", "right", "bottom", "width", "height"].forEach((prop) => {
        windowEl.style[prop] = saved[prop] || "";
      });
      if (
        appLaunchMeta[windowEl.id]
        && !windowEl.classList.contains("closed")
        && !windowEl.classList.contains("minimized")
      ) {
        launchedWindowIds.add(windowEl.id);
      }
    });
    taskApps.forEach((button) => {
      const relatedWindow = document.querySelector(`#${button.dataset.window}`);
      button.classList.toggle("minimized", relatedWindow?.classList.contains("minimized"));
      button.classList.toggle("closed", relatedWindow?.classList.contains("closed"));
      button.classList.toggle("active", relatedWindow?.classList.contains("focused"));
    });
  } catch (e) {
    console.log(e)
  }
}

function makeWindowsDraggable() {
  windows.forEach((windowEl) => {
    const titlebar = windowEl.querySelector(".window-titlebar");
    if (!titlebar) return;

    // Double click to maximize/restore
    titlebar.addEventListener("dblclick", (event) => {
      if (event.target.closest("button")) return;
      maximizeWindow(windowEl.id);
    });

    titlebar.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      
      // If maximized, restore and center under cursor when dragged
      let isMax = windowEl.classList.contains("maximized");
      if (isMax) {
        windowEl.classList.remove("maximized");
        const bounds = preMaximizedBounds.get(windowEl.id);
        if (bounds) {
          windowEl.style.width = bounds.width;
          windowEl.style.height = bounds.height;
        } else {
          windowEl.style.width = "600px";
          windowEl.style.height = "500px";
        }
        
        // Re-center around pointer
        const newRect = windowEl.getBoundingClientRect();
        windowEl.style.left = `${Math.max(0, event.clientX - newRect.width / 2)}px`;
        windowEl.style.top = `${Math.max(0, event.clientY - 15)}px`;
      }

      focusWindow(windowEl.id);
      const rect = windowEl.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      windowEl.style.width = `${rect.width}px`;
      windowEl.style.height = `${rect.height}px`;
      windowEl.style.right = "auto";
      windowEl.style.bottom = "auto";
      windowEl.classList.add("dragging");
      titlebar.setPointerCapture(event.pointerId);

      // Create or locate snap ghost element
      let snapGhost = document.querySelector(".snap-ghost");
      if (!snapGhost) {
        snapGhost = document.createElement("div");
        snapGhost.className = "snap-ghost";
        document.body.appendChild(snapGhost);
      }

      let activeSnap = null; // 'maximize', 'left', 'right'

      const onMove = (moveEvent) => {
        const maxLeft = window.innerWidth - 80;
        const maxTop = window.innerHeight - 80;
        const nextLeft = Math.max(0, Math.min(maxLeft, moveEvent.clientX - offsetX));
        const nextTop = Math.max(0, Math.min(maxTop, moveEvent.clientY - offsetY));
        windowEl.style.left = `${nextLeft}px`;
        windowEl.style.top = `${nextTop}px`;

        // Check Snap Assist Zones based on pointer coordinate
        const cx = moveEvent.clientX;
        const cy = moveEvent.clientY;

        if (cy < 18) {
          activeSnap = "maximize";
          snapGhost.style.inset = "0";
          snapGhost.style.borderRadius = "0";
          snapGhost.classList.add("visible");
        } else if (cx < 20) {
          activeSnap = "left";
          snapGhost.style.inset = "12px calc(50% + 6px) calc(54px + 12px) 12px";
          snapGhost.style.borderRadius = "12px";
          snapGhost.classList.add("visible");
        } else if (cx > window.innerWidth - 20) {
          activeSnap = "right";
          snapGhost.style.inset = "12px 12px calc(54px + 12px) calc(50% + 6px)";
          snapGhost.style.borderRadius = "12px";
          snapGhost.classList.add("visible");
        } else {
          activeSnap = null;
          snapGhost.classList.remove("visible");
        }
      };

      const onUp = () => {
        windowEl.classList.remove("dragging");
        snapGhost?.classList.remove("visible");
        titlebar.removeEventListener("pointermove", onMove);
        titlebar.removeEventListener("pointerup", onUp);

        // Perform snapping action
        if (activeSnap === "maximize") {
          maximizeWindow(windowEl.id);
        } else if (activeSnap === "left") {
          preMaximizedBounds.set(windowEl.id, {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
          });
          windowEl.style.left = "12px";
          windowEl.style.top = "12px";
          windowEl.style.width = "calc(50% - 18px)";
          windowEl.style.height = "calc(100vh - 54px - 36px)";
          windowEl.classList.remove("maximized");
        } else if (activeSnap === "right") {
          preMaximizedBounds.set(windowEl.id, {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
          });
          windowEl.style.left = "calc(50% + 6px)";
          windowEl.style.top = "12px";
          windowEl.style.width = "calc(50% - 18px)";
          windowEl.style.height = "calc(100vh - 54px - 36px)";
          windowEl.classList.remove("maximized");
        }

        persistWindowLayout();
      };
      titlebar.addEventListener("pointermove", onMove);
      titlebar.addEventListener("pointerup", onUp);
    });
  });
}

function makeWindowsResizable() {
  const resizeZones = ["t", "r", "b", "l", "tl", "tr", "bl", "br"];
  
  windows.forEach((windowEl) => {
    if (windowEl.querySelector(".resize-handle")) return;
    
    resizeZones.forEach((zone) => {
      const handle = document.createElement("div");
      handle.className = `resize-handle ${zone}`;
      windowEl.appendChild(handle);
      
      handle.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        focusWindow(windowEl.id);
        
        if (windowEl.classList.contains("maximized")) return;
        
        const initialRect = windowEl.getBoundingClientRect();
        const initialX = event.clientX;
        const initialY = event.clientY;
        const minWidth = 280;
        const minHeight = 220;
        
        const parent = document.querySelector(".remote-desktop");
        const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0 };
        
        handle.setPointerCapture(event.pointerId);
        
        const onMove = (moveEvent) => {
          const deltaX = moveEvent.clientX - initialX;
          const deltaY = moveEvent.clientY - initialY;
          
          let newWidth = initialRect.width;
          let newHeight = initialRect.height;
          let newLeft = initialRect.left - parentRect.left;
          let newTop = initialRect.top - parentRect.top;
          
          if (zone.includes("r")) {
            newWidth = Math.max(minWidth, initialRect.width + deltaX);
          } else if (zone.includes("l")) {
            const potentialWidth = initialRect.width - deltaX;
            if (potentialWidth >= minWidth) {
              newWidth = potentialWidth;
              newLeft = (initialRect.left - parentRect.left) + deltaX;
            }
          }
          
          if (zone.includes("b")) {
            newHeight = Math.max(minHeight, initialRect.height + deltaY);
          } else if (zone.includes("t")) {
            const potentialHeight = initialRect.height - deltaY;
            if (potentialHeight >= minHeight) {
              newHeight = potentialHeight;
              newTop = (initialRect.top - parentRect.top) + deltaY;
            }
          }
          
          windowEl.style.width = `${newWidth}px`;
          windowEl.style.height = `${newHeight}px`;
          windowEl.style.left = `${newLeft}px`;
          windowEl.style.top = `${newTop}px`;
        };
        
        const onUp = () => {
          handle.releasePointerCapture(event.pointerId);
          handle.removeEventListener("pointermove", onMove);
          handle.removeEventListener("pointerup", onUp);
          persistWindowLayout();
        };
        
        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);
      });
    });
  });
}

// Right-Click Context Menu Logic for Taskbar Buttons
const contextMenu = document.querySelector("#taskbarContextMenu");
const contextBringFront = document.querySelector("#contextBringFront");
const contextMinimize = document.querySelector("#contextMinimize");
const contextMaximize = document.querySelector("#contextMaximize");
const contextClose = document.querySelector("#contextClose");
let activeWindowForContext = null;

taskApps.forEach((button) => {
  button.addEventListener("click", () => {
    focusWindow(button.dataset.window);
  });

  // Handle right-click context menu
  button.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    activeWindowForContext = button.dataset.window;
    
    // Position menu neatly above the clicked button
    const btnRect = button.getBoundingClientRect();
    contextMenu.style.left = `${btnRect.left}px`;
    contextMenu.style.top = `${btnRect.top - 160}px`;
    contextMenu.classList.remove("hidden");
  });
});

// Close context menus on any click outside
document.addEventListener("click", () => {
  contextMenu?.classList.add("hidden");
  fileContextMenu?.classList.add("hidden");
  tabContextMenu?.classList.add("hidden");
});

// Handle Context Menu Item Actions
contextBringFront?.addEventListener("click", () => {
  if (activeWindowForContext) focusWindow(activeWindowForContext);
});

// File explorer context menu event listeners
fileContextOpen?.addEventListener("click", () => {
  if (activeItemForFileContext) {
    if (activeItemForFileContext.type === "dir") {
      changePath(joinPath(currentPath, activeItemForFileContext.name));
    } else {
      openRemoteFile(joinPath(currentPath, activeItemForFileContext.name));
    }
  }
});

fileContextRename?.addEventListener("click", () => {
  renameSelectedItem();
});

fileContextDownload?.addEventListener("click", () => {
  copySelected();
});

fileContextCopyPath?.addEventListener("click", () => {
  if (activeItemForFileContext) {
    const fullPath = joinPath(currentPath, activeItemForFileContext.name);
    navigator.clipboard.writeText(fullPath).then(() => {
      showToast("Copied full path to clipboard", "success");
    }).catch(() => {
      showToast("Failed to copy path", "error");
    });
  }
});

fileContextDelete?.addEventListener("click", () => {
  deleteSelectedItem();
});

// Editor tab context menu event listeners
tabContextClose?.addEventListener("click", () => {
  if (activeTabForContext) closeEditorTab(activeTabForContext);
});

tabContextCloseOthers?.addEventListener("click", () => {
  if (activeTabForContext) {
    const openPaths = Array.from(openFiles.keys());
    openPaths.forEach((path) => {
      if (path !== activeTabForContext) {
        closeEditorTab(path);
      }
    });
  }
});

tabContextCloseSaved?.addEventListener("click", () => {
  const openPaths = Array.from(openFiles.keys());
  openPaths.forEach((path) => {
    const file = openFiles.get(path);
    if (file && !file.dirty) {
      closeEditorTab(path);
    }
  });
});

tabContextCloseAll?.addEventListener("click", () => {
  const openPaths = Array.from(openFiles.keys());
  openPaths.forEach((path) => {
    closeEditorTab(path);
  });
});

// Render Command History Helper
function renderCommandHistory() {
  if (!historyPanelList) return;
  if (commandHistory.length === 0) {
    historyPanelList.innerHTML = `<div class="history-empty-message">No commands run yet</div>`;
    return;
  }
  
  historyPanelList.innerHTML = commandHistory
    .slice(-30)
    .reverse()
    .map(cmd => `<button type="button" class="history-item" title="${escapeHtml(cmd)}">${escapeHtml(cmd)}</button>`)
    .join("");
    
  historyPanelList.querySelectorAll(".history-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      terminalInput.value = btn.textContent;
      focusWindow("terminalWindow");
      terminalInput.focus();
    });
  });
}

contextMinimize?.addEventListener("click", () => {
  if (activeWindowForContext) minimizeWindow(activeWindowForContext);
});

contextMaximize?.addEventListener("click", () => {
  if (activeWindowForContext) maximizeWindow(activeWindowForContext);
});

contextClose?.addEventListener("click", () => {
  if (activeWindowForContext) closeWindow(activeWindowForContext);
});

document.querySelector(".start-button").addEventListener("click", (event) => {
  event.stopPropagation();
  toggleStartMenu();
});

document.addEventListener("click", (event) => {
  const altTabItem = event.target.closest("[data-alt-tab-index]");
  if (altTabItem) {
    altTabIndex = Number(altTabItem.dataset.altTabIndex) || 0;
    updateAltTabSelection();
    closeAltTabSwitcher(true);
    return;
  }

  const launcher = event.target.closest("[data-launch-window]");
  if (launcher) {
    closeStartMenu();
    focusWindow(launcher.dataset.launchWindow);
    return;
  }

  if (event.target.closest("#startMenuPanel")) return;
  closeStartMenu();
});

window.addEventListener("blur", () => {
  closeAltTabSwitcher(true);
  closeStartMenu(false);
});

startDisconnectButton?.addEventListener("click", () => {
  closeStartMenu();
  disconnectSession();
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
  barTime.textContent = formatTime();
}, 1000);

require.config({ paths: { vs: "./node_modules/monaco-editor/min/vs" } });
require(["vs/editor/editor.main"], () => {
  ensureEditor();
});

saveFileButton.disabled = true;
renderEditorExplorer();
makeWindowsDraggable();
makeWindowsResizable();
initEditorExplorerResize();
new ResizeObserver(() => persistWindowLayout()).observe(document.querySelector(".remote-desktop"));
windows.forEach((windowEl) => {
  new ResizeObserver(() => {
    if (!windowEl.classList.contains("minimized") && !windowEl.classList.contains("closed")) persistWindowLayout();
  }).observe(windowEl);
});
applySavedLayout();
applyAnimationSetting();
renderRecentApps();

async function initializeSessionState() {
  loadSavedConnection();
  updateConnectionDetails();
  renderFiles([], true);

  const hadSavedSession = Boolean(loadActiveSession());
  const restored = await restoreActiveSession();
  if (!restored && !session) {
    connectPanel.classList.remove("hidden");
    if (!hadSavedSession) startAutoConnect();
  }
}

initializeSessionState();

// ==========================================
// Phase 3 App upgrades event listeners
// ==========================================

// Back/Forward Navigation
backButton?.addEventListener("click", () => {
  if (pathHistoryBack.length > 0) {
    const prev = pathHistoryBack.pop();
    pathHistoryForward.push(currentPath);
    changePath(prev, false);
  }
});

forwardButton?.addEventListener("click", () => {
  if (pathHistoryForward.length > 0) {
    const next = pathHistoryForward.pop();
    pathHistoryBack.push(currentPath);
    changePath(next, false);
  }
});

// Real-time File Filter Input
fileSearch?.addEventListener("input", (e) => {
  renderFiles(getFilteredItems());
});

// Grid/List View Toggler
viewToggleBtn?.addEventListener("click", () => {
  isGridView = !isGridView;
  viewToggleBtn.textContent = isGridView ? "List" : "Grid";
  fileTable.classList.toggle("grid-view", isGridView);
  renderFiles(currentItems);
});

// History Panel Togglers
toggleHistoryBtn?.addEventListener("click", () => {
  terminalHistoryPanel?.classList.toggle("hidden");
  renderCommandHistory();
});

closeHistoryBtn?.addEventListener("click", () => {
  terminalHistoryPanel?.classList.add("hidden");
});

// Hidden Files Toggler
const toggleHiddenBtn = document.querySelector("#toggleHiddenBtn");
toggleHiddenBtn?.addEventListener("click", () => {
  showHiddenFiles = !showHiddenFiles;
  toggleHiddenBtn.classList.toggle("active", showHiddenFiles);
  renderFiles(getFilteredItems());
});

// Keyboard navigation on File Table
fileTable?.addEventListener("keydown", (event) => {
  if (currentItems.length === 0) return;
  
  const items = currentItems;
  const primaryItem = getPrimarySelectedItem();
  let idx = primaryItem ? items.findIndex(item => item.name === primaryItem.name) : -1;
  
  if (event.key === "ArrowDown") {
    event.preventDefault();
    idx = Math.min(items.length - 1, idx + 1);
    if (idx === -1) idx = 0;
    selected.clear();
    selected.add(items[idx].name);
    lastSelectedIndex = idx;
    renderFiles(items);
    
    // Scroll selected row into view
    const rows = fileRows.querySelectorAll(".file-row");
    rows[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    idx = Math.max(0, idx - 1);
    selected.clear();
    selected.add(items[idx].name);
    lastSelectedIndex = idx;
    renderFiles(items);
    
    // Scroll selected row into view
    const rows = fileRows.querySelectorAll(".file-row");
    rows[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (primaryItem) {
      if (primaryItem.type === "dir") changePath(joinPath(currentPath, primaryItem.name));
      else openRemoteFile(joinPath(currentPath, primaryItem.name));
    }
  } else if (event.key === "Delete") {
    event.preventDefault();
    deleteSelectedItem();
  } else if (event.key === "F2") {
    event.preventDefault();
    renameSelectedItem();
  }
});

// Column sorting triggers
document.querySelectorAll(".sort-header").forEach(header => {
  header.addEventListener("click", () => {
    sortFiles(header.dataset.sort);
  });
});

// Local File Picker Upload trigger
localFilePicker?.addEventListener("change", async () => {
  if (localFilePicker.files.length > 0) {
    await uploadLocalFiles(localFilePicker.files);
    localFilePicker.value = ""; // Clear file selector
  }
});

// Trigger upload picker on drop zone clicks
document.querySelector("#dropZone")?.addEventListener("click", () => {
  localFilePicker?.click();
});

// Drag over/drop zones style classes and uploads
const dragTarget = document.querySelector("#dropZone");
dragTarget?.addEventListener("dragover", (e) => {
  e.preventDefault();
  dragTarget.classList.add("dragover");
});
dragTarget?.addEventListener("dragleave", () => {
  dragTarget.classList.remove("dragover");
});
dragTarget?.addEventListener("drop", async (e) => {
  e.preventDefault();
  dragTarget.classList.remove("dragover");
  if (e.dataTransfer.files.length > 0) {
    await uploadLocalFiles(e.dataTransfer.files);
  }
});

async function uploadLocalFiles(files) {
  if (!session) {
    showToast("Connect to SSH first", "info");
    return;
  }
  
  focusWindow("transferWindow");
  
  for (const file of files) {
    const reader = new FileReader();
    const transferId = addTransferQueue(file.name, "Upload");
    
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result.split(",")[1];
        updateTransferProgress(transferId, 45, "Uploading...");
        
        await request(`/api/sessions/${session.id}/upload`, {
          method: "POST",
          body: JSON.stringify({
            name: file.name,
            path: transferPath || session.startPath || ".",
            base64: base64
          })
        });
        
        updateTransferProgress(transferId, 100, "Completed");
        showToast(`Successfully uploaded "${file.name}"`, "success");
        
        if (transferPath === currentPath) {
          openPath(currentPath || ".");
        }
        if (transferPath === editorExplorerPath) {
          openEditorExplorerPath(editorExplorerPath || ".");
        }
      } catch (err) {
        updateTransferProgress(transferId, 100, "Failed", true);
        showToast(`Upload failed for "${file.name}": ${err.message}`, "error");
      }
    };
    reader.readAsDataURL(file);
  }
}

// Clear finished queues in transfers
clearTransferHistory?.addEventListener("click", () => {
  document.querySelectorAll(".transfer-item").forEach(item => {
    const speed = item.querySelector(".transfer-speed");
    if (speed && (speed.textContent === "Finished" || speed.textContent === "Failed")) {
      item.remove();
    }
  });
});

// Monaco Global Ctrl+S key hook to trigger file saves
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    const activeWindow = document.querySelector(".focused");
    if (activeWindow && activeWindow.id === "editorWindow") {
      e.preventDefault();
      saveOpenFile();
    }
  }
});

// Terminal Log Searching and font size adjustments
terminalZoomIn?.addEventListener("click", () => {
  terminalFontSize = Math.min(24, terminalFontSize + 1);
  terminalLog.style.fontSize = `${terminalFontSize}px`;
  if (terminalFontSizeLabel) terminalFontSizeLabel.textContent = `${terminalFontSize}px`;
});

terminalZoomOut?.addEventListener("click", () => {
  terminalFontSize = Math.max(9, terminalFontSize - 1);
  terminalLog.style.fontSize = `${terminalFontSize}px`;
  if (terminalFontSizeLabel) terminalFontSizeLabel.textContent = `${terminalFontSize}px`;
});



function keepBarOpenAfterLeave(element, openClass) {
  if (!element) return;
  let closeTimer = null;
  const closeDelay = 4500;

  const openBar = () => {
    clearTimeout(closeTimer);
    element.classList.add(openClass);
  };

  const scheduleClose = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      element.classList.remove(openClass);
    }, closeDelay);
  };

  element.addEventListener("mouseenter", openBar);
  element.addEventListener("focusin", openBar);
  element.addEventListener("mouseleave", scheduleClose);
  element.addEventListener("focusout", scheduleClose);
  scheduleClose();
}

keepBarOpenAfterLeave(workspaceBar, "bar-open");
keepBarOpenAfterLeave(taskbarShell, "taskbar-open");

pushTerminal("SSH Bridge Tunnel Terminal [v1.0.0]");
pushTerminal("Type command options or click quick command pills below to execute.");
pushTerminal("Ready. Please sign in to establish a remote SSH session.");
pushTerminal("");
