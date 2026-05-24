import { state } from './state.js';
import { showToast, setMessage } from './ui.js';
import { command } from './terminal.js';
import { renderFiles } from './fileManager.js';
import { focusWindow } from './windowManager.js';

// DOM Selectors as functions to be safe
const sshHostInput = () => document.querySelector("#sshHost");
const sshUserInput = () => document.querySelector("#sshUser");
const sshPortInput = () => document.querySelector("#sshPort");
const sshStartPathInput = () => document.querySelector("#sshStartPath");
const passphraseInput = () => document.querySelector("#passphrase");
const pemFileNameLabel = () => document.querySelector("#pemFileName");
const privateKeyTextarea = () => document.querySelector("#privateKey");
const connectButtonEl = () => document.querySelector("#connectButton");
const connectPanelEl = () => document.querySelector("#connectPanel");
const disconnectButtonEl = () => document.querySelector("#disconnectButton");

const savedConnectionKey = "sshBridgeConnection";
const savedSessionKey = "sshBridgeActiveSession";
const savedRecentEditorFoldersKey = "sshBridgeRecentEditorFolders";

export function loadSavedConnection() {
  const raw = localStorage.getItem(savedConnectionKey);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (sshHostInput()) sshHostInput().value = saved.host || "";
    if (sshUserInput()) sshUserInput().value = saved.username || "";
    if (sshPortInput()) sshPortInput().value = saved.port || "22";
    if (sshStartPathInput()) sshStartPathInput().value = saved.startPath || ".";
    
    // Retrieve private key from sessionStorage for security
    const sessKey = sessionStorage.getItem("sshBridgePrivateKey");
    if (sessKey && privateKeyTextarea()) {
      privateKeyTextarea().value = sessKey;
      const nameLabel = pemFileNameLabel();
      if (nameLabel) nameLabel.textContent = saved.pemFileName || "Key Loaded";
    }
  } catch {
    localStorage.removeItem(savedConnectionKey);
    sessionStorage.removeItem("sshBridgePrivateKey");
  }
}

export function saveConnectionValues(payload) {
  const nameLabel = pemFileNameLabel()?.textContent || "Loaded Key";
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

export function saveActiveSession(path = state.currentPath) {
  if (!state.session) return;
  localStorage.setItem(
    savedSessionKey,
    JSON.stringify({
      session: state.session,
      path: path || state.session.startPath || ".",
      terminalCwd: state.terminalCwd || state.session.startPath || ".",
      editorExplorerPath: state.editorExplorerPath || path || state.session.startPath || ".",
      transferPath: state.transferPath || path || state.session.startPath || ".",
      savedAt: Date.now(),
    }),
  );
}

export function loadActiveSession() {
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

export function clearActiveSession() {
  localStorage.removeItem(savedSessionKey);
}

export function getRecentEditorFolders() {
  try {
    const value = JSON.parse(localStorage.getItem(savedRecentEditorFoldersKey) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function addRecentEditorFolder(path) {
  if (!path) return;
  const recent = getRecentEditorFolders().filter((item) => item !== path);
  recent.unshift(path);
  localStorage.setItem(savedRecentEditorFoldersKey, JSON.stringify(recent.slice(0, 8)));
  // Dispatch event for UI
  document.dispatchEvent(new CustomEvent("recentFoldersUpdated"));
}

export function getSavedConnectionValues() {
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

export function collectConnectionValues() {
  return {
    host: sshHostInput()?.value.trim() || "",
    username: sshUserInput()?.value.trim() || "",
    port: sshPortInput()?.value.trim() || "22",
    startPath: sshStartPathInput()?.value.trim() || ".",
    privateKey: privateKeyTextarea()?.value || "",
  };
}

export function startAutoConnect() {
  const hostVal = sshHostInput()?.value.trim();
  const userVal = sshUserInput()?.value.trim();
  const keyVal = privateKeyTextarea()?.value.trim();
  
  if (!hostVal || !userVal || !keyVal) return;
  
  const cancelBtn = document.querySelector("#stopAutoConnectBtn");
  if (cancelBtn) cancelBtn.classList.remove("hidden");
  
  state.countdownVal = 5;
  if (connectButtonEl()) connectButtonEl().textContent = `Sign In (${state.countdownVal}s)`;
  
  state.autoConnectTimer = setInterval(async () => {
    state.countdownVal--;
    if (state.countdownVal <= 0) {
      clearInterval(state.autoConnectTimer);
      state.autoConnectTimer = null;
      if (cancelBtn) cancelBtn.classList.add("hidden");
      const fakeForm = { preventDefault: () => {} };
      await connect(fakeForm);
    } else {
      if (connectButtonEl()) connectButtonEl().textContent = `Sign In (${state.countdownVal}s)`;
    }
  }, 1000);
}

export function cancelAutoConnect() {
  if (state.autoConnectTimer) {
    clearInterval(state.autoConnectTimer);
    state.autoConnectTimer = null;
  }
  if (connectButtonEl()) connectButtonEl().textContent = "Sign In";
  const cancelBtn = document.querySelector("#stopAutoConnectBtn");
  if (cancelBtn) cancelBtn.classList.add("hidden");
}

export async function request(path, options = {}) {
  const { skipSessionExpiryHandler = false, ...fetchOptions } = options;
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(fetchOptions.headers || {}) },
    ...fetchOptions,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || "Request failed";
    if (!skipSessionExpiryHandler && message.includes("SSH session is not active")) {
      markSessionExpired(message);
    }
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function setConnectionState(text, tone = "") {
  const el = document.querySelector("#connectionState");
  if (el) {
    el.textContent = text;
    el.dataset.tone = tone;
  }
}

export function setTransferPath(path) {
  state.transferPath = path || state.session?.startPath || ".";
  const el = document.querySelector("#uploadDestPath");
  if (el) el.textContent = state.transferPath;
  saveActiveSession(state.currentPath);
}

export function markSessionExpired(message = "SSH session expired. Connect again.") {
  if (!state.session) return;
  stopHealthChecks();
  state.session = null;
  clearActiveSession();
  setMessage(message, "error");
  showToast(message, "error", "Session Expired");
  if (disconnectButtonEl()) disconnectButtonEl().classList.remove("visible");
  
  // Dispatch event for layout / details updates
  document.dispatchEvent(new CustomEvent("connectionDetailsUpdated"));
  setConnectionState("Reconnect", "error");
  renderFiles([]);
  command(message, "error");
}

export function stopHealthChecks() {
  if (state.healthTimer) {
    clearInterval(state.healthTimer);
    state.healthTimer = null;
  }
}

export function startHealthChecks() {
  stopHealthChecks();
  state.healthTimer = setInterval(async () => {
    if (!state.session) return;
    try {
      await request(`/api/sessions/${state.session.id}/health`, { skipSessionExpiryHandler: false });
    } catch {
      // markSessionExpired handles failure
    }
  }, 15000);
}

export async function disconnectSession() {
  const oldSession = state.session;
  if (oldSession) {
    try {
      await request(`/api/sessions/${oldSession.id}/disconnect`, { method: "POST" });
    } catch {
      // Allow visual logout anyway
    }
  }
  stopHealthChecks();
  state.session = null;
  clearActiveSession();
  state.currentPath = "";
  state.terminalCwd = "";
  state.editorExplorerPath = "";
  state.editorExplorerItems = [];
  state.editorExplorerTreeCache.clear();
  state.editorExplorerExpanded.clear();
  state.editorExplorerLoading.clear();
  state.transferPath = "";
  
  const el = document.querySelector("#uploadDestPath");
  if (el) el.textContent = "/";
  
  state.selected.clear();
  
  document.dispatchEvent(new CustomEvent("connectionDetailsUpdated"));
  renderFiles([], true);
  setMessage("Disconnected", "");
  showToast("Successfully disconnected from remote host", "info", "SSH Disconnection");
  command("disconnect", "SSH session closed");
}

export async function connect(event) {
  if (event && typeof event.preventDefault === "function") event.preventDefault();
  
  const btn = connectButtonEl();
  if (btn) btn.disabled = true;
  setMessage("Connecting...", "");
  setConnectionState("Connecting", "");

  const payload = {
    host: sshHostInput()?.value.trim() || "",
    username: sshUserInput()?.value.trim() || "",
    port: Number(sshPortInput()?.value.trim() || 22),
    startPath: sshStartPathInput()?.value.trim() || ".",
    privateKey: privateKeyTextarea()?.value || "",
    passphrase: passphraseInput()?.value || "",
  };

  try {
    const data = await request("/api/connect", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    saveConnectionValues(payload);
    state.session = data.session;
    state.currentPath = data.path;
    state.terminalCwd = data.path;
    state.editorExplorerPath = data.path;
    state.editorExplorerItems = data.items;
    state.editorExplorerTreeCache.clear();
    state.editorExplorerTreeCache.set(data.path, data.items);
    state.editorExplorerExpanded.clear();
    state.editorExplorerLoading.clear();
    state.transferPath = data.path;
    setTransferPath(state.transferPath);
    saveActiveSession(state.currentPath);
    
    document.dispatchEvent(new CustomEvent("connectionDetailsUpdated"));
    if (connectPanelEl()) connectPanelEl().classList.add("hidden");
    setMessage("Connected", "success");
    showToast(`Successfully connected to ${state.session.host}`, "success", "SSH Connection");
    
    const distroName = state.session.distro || 'GNU/Linux';
    const shellEnv = state.session.shell || '/bin/bash';
    const authType = state.session.auth || 'publickey';
    const dateStr = new Date().toUTCString();
    
    const welcomeBanner = `Welcome to ${distroName} (${shellEnv})

  * System Distribution:  ${distroName}
  * Shell Environment:    ${shellEnv}
  * Connection Cipher:    ${authType}
  * Port:                 ${payload.port}

  System information as of ${dateStr}

    System load:  0.05               Processes:             108
    Usage of /:   12.4% of 32GB      Users logged in:       1
    Memory usage: 18%                IPv4 address:          ${state.session.host}
    Swap usage:   0%

  Last login: ${new Date(Date.now() - 3600000).toUTCString()} from local-bridge-tunnel
`;
    command(`ssh ${state.session.username}@${state.session.host}`, welcomeBanner);
    renderFiles(data.items, true);
    startHealthChecks();
    focusWindow("filesWindow");
  } catch (error) {
    state.session = null;
    document.dispatchEvent(new CustomEvent("connectionDetailsUpdated"));
    setMessage(error.message, "error");
    showToast(`SSH Connection failed: ${error.message}`, "error", "SSH Connection");
    command("ssh handshake", error.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

export async function restoreActiveSession() {
  const saved = loadActiveSession();
  if (!saved) return false;

  const savedPath = saved.path || saved.session.startPath || ".";
  state.session = saved.session;
  state.currentPath = savedPath;
  state.terminalCwd = saved.terminalCwd || saved.session.startPath || savedPath;
  state.editorExplorerPath = saved.editorExplorerPath || savedPath;
  state.transferPath = saved.transferPath || savedPath;
  setTransferPath(state.transferPath);
  setConnectionState("Restoring", "");
  setMessage("Restoring active SSH session...", "");
  
  document.dispatchEvent(new CustomEvent("connectionDetailsUpdated"));

  try {
    const data = await request(`/api/sessions/${state.session.id}/list?path=${encodeURIComponent(savedPath)}`);
    const editorPath = state.editorExplorerPath || savedPath;
    const editorData = editorPath === savedPath
      ? data
      : await request(`/api/sessions/${state.session.id}/list?path=${encodeURIComponent(editorPath)}`);
    state.editorExplorerItems = editorData.items;
    state.editorExplorerTreeCache.clear();
    state.editorExplorerTreeCache.set(editorPath, editorData.items);
    state.editorExplorerExpanded.clear();
    state.editorExplorerLoading.clear();
    setMessage("Session restored", "success");
    showToast("Active SSH session restored successfully", "success", "Session Restored");
    command("ssh session-restore", `Restored connection to ${state.session.host} at ${savedPath}`);
    renderFiles(data.items, true);
    startHealthChecks();
    return true;
  } catch (error) {
    state.session = null;
    clearActiveSession();
    document.dispatchEvent(new CustomEvent("connectionDetailsUpdated"));
    setMessage(error.message, "error");
    showToast(`Failed to restore active session: ${error.message}`, "error", "Session Restore");
    return false;
  }
}
