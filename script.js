import { state } from './js/state.js';
import {
  escapeHtml, showToast, showModal, renderSkeleton, setMessage,
  formatTime, persistWindowLayout, applySavedLayout, appLaunchMeta,
  applyAnimationSetting, setAnimationEnabled
} from './js/ui.js';
import {
  loadSavedConnection, saveConnectionValues, saveActiveSession, loadActiveSession,
  clearActiveSession, getRecentEditorFolders, addRecentEditorFolder, getSavedConnectionValues,
  collectConnectionValues, startAutoConnect, cancelAutoConnect, request, setConnectionState,
  setTransferPath, markSessionExpired, stopHealthChecks, startHealthChecks, disconnectSession,
  connect, restoreActiveSession
} from './js/connection.js';
import {
  animateWindow, focusWindow, minimizeWindow, closeWindow, maximizeWindow,
  makeWindowsDraggable, makeWindowsResizable, preMaximizedBounds, syncTaskbarState,
  getAltTabWindows, renderAltTabItems, animateAltTabOpen, animateAltTabSelection,
  updateAltTabSelection, openAltTabSwitcher, closeAltTabSwitcher
} from './js/windowManager.js';
import {
  loadRecentApps, saveRecentApps, formatRecentAppTime, renderRecentApps,
  rememberRecentApp, openStartMenu, closeStartMenu, toggleStartMenu
} from './js/startMenu.js';
import {
  addTransferQueue, updateTransferProgress
} from './js/transfers.js';
import {
  joinPath, renderBreadcrumbs, makeCell, getSelectedItems, getPrimarySelectedItem,
  getFileIconInfo, getFilteredItems, renderFiles, runFileAction, openSelectedItem,
  createFile, renameSelectedItem, deleteSelectedItem, changePath, openPath, sortFiles, copySelected
} from './js/fileManager.js';
import {
  defineM2MonacoTheme, ensureEditor, renderEditorTabs, switchEditorTab, closeEditorTab,
  openRemoteFile, saveCurrentFile, updateEditorWelcome, updateEditorToolbarState,
  inferLanguage, formatLanguageLabel, updateEditorStatusBar, openEditorExplorerPath,
  renderEditorExplorer, toggleEditorTheme, toggleEditorMinimap, openCommandPalette,
  closeCommandPalette, renderCommandPalette, editorThemes, initializeEditorExplorerResize,
  setEditorWorkbenchView, applyEditorFontSize, updateEditorThemeClass
} from './js/editor.js';
import {
  parseAnsiColors, renderTerminalLog, pushTerminal, command, updateTerminalPrompt,
  focusTerminalInputAtBottom, runTerminalCommand, initializeNativeTerminal,
  attachTerminal, detachTerminal
} from './js/terminal.js';

// DOM Selectors
const workspaceBar = document.querySelector(".workspace-bar");
const taskbarShell = document.querySelector(".taskbar-shell");
const connectForm = document.querySelector("#connectForm");
const disconnectButton = document.querySelector("#disconnectButton");
const closeConnectButton = document.querySelector("#closeConnectButton");
const viewToggleBtn = document.querySelector("#viewToggleBtn");
const toggleHiddenBtn = document.querySelector("#toggleHiddenBtn");
const localFilePicker = document.querySelector("#localFilePicker");
const clearTransferHistory = document.querySelector("#clearTransferHistory");
const animationToggle = document.querySelector("#animationToggle");
const pemFileInput = document.querySelector("#pemFile");
const privateKeyTextarea = document.querySelector("#privateKey");
const toggleKeyTextarea = document.querySelector("#toggleKeyTextarea");
const textareaContainer = document.querySelector("#textareaContainer");
const stopAutoConnectBtn = document.querySelector("#stopAutoConnectBtn");
const taskbarTooltip = document.createElement("div");
taskbarTooltip.className = "taskbar-tooltip hidden";
taskbarTooltip.setAttribute("role", "tooltip");
document.body.append(taskbarTooltip);

// Setup Event Listeners

// 1. Connection Event Listeners
function closeConnectionSurface() {
  document.querySelector("#connectPanel")?.classList.add("hidden");
  cancelAutoConnect();
}

function openConnectionSurface() {
  if (state.session) {
    focusWindow("settingsWindow");
    return;
  }
  document.querySelector("#connectPanel")?.classList.remove("hidden");
}

connectForm?.addEventListener("submit", connect);
disconnectButton?.addEventListener("submit", (e) => e.preventDefault()); // Disconnect is a button, not form, but to be safe
disconnectButton?.addEventListener("click", disconnectSession);
closeConnectButton?.addEventListener("click", closeConnectionSurface);
document.querySelector("#connectionToggle")?.addEventListener("click", openConnectionSurface);
document.querySelector("#trayConnectionPill")?.addEventListener("click", openConnectionSurface);
document.querySelector("#connectPanel")?.addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeConnectionSurface();
});
stopAutoConnectBtn?.addEventListener("click", cancelAutoConnect);

// Fullscreen toggle event listeners
const fullscreenButton = document.querySelector("#fullscreenButton");
if (fullscreenButton) {
  fullscreenButton.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        showToast(`Fullscreen error: ${err.message}`, "error");
      });
    } else {
      document.exitFullscreen().catch((err) => {
        showToast(`Exit fullscreen error: ${err.message}`, "error");
      });
    }
  });
}

document.addEventListener("fullscreenchange", () => {
  const fullscreenButton = document.querySelector("#fullscreenButton");
  if (!fullscreenButton) return;
  
  const span = fullscreenButton.querySelector("span");
  const svg = fullscreenButton.querySelector("svg");
  
  if (document.fullscreenElement) {
    fullscreenButton.title = "Exit Fullscreen";
    if (span) span.textContent = "Exit Full Screen";
    if (svg) {
      svg.innerHTML = '<path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"/>';
    }
  } else {
    fullscreenButton.title = "Enter Fullscreen";
    if (span) span.textContent = "Full Screen";
    if (svg) {
      svg.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>';
    }
  }
});

toggleKeyTextarea?.addEventListener("click", () => {
  textareaContainer?.classList.toggle("hidden");
  privateKeyTextarea?.focus();
});
pemFileInput?.addEventListener("change", async () => {
  const file = pemFileInput.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    if (privateKeyTextarea) privateKeyTextarea.value = text;
    const label = document.querySelector("#pemFileName");
    if (label) label.textContent = file.name;
    textareaContainer?.classList.add("hidden");
    showToast(`Loaded private key "${file.name}"`, "success");
  } catch (error) {
    showToast(`Failed to read key file: ${error.message}`, "error");
  }
});

// 2. Navigation & View Toggles
document.querySelector("#backButton")?.addEventListener("click", () => {
  if (state.pathHistoryBack.length > 0) {
    const prev = state.pathHistoryBack.pop();
    state.pathHistoryForward.push(state.currentPath);
    changePath(prev, false);
  }
});
document.querySelector("#forwardButton")?.addEventListener("click", () => {
  if (state.pathHistoryForward.length > 0) {
    const next = state.pathHistoryForward.pop();
    state.pathHistoryBack.push(state.currentPath);
    changePath(next, false);
  }
});
document.querySelector("#refreshButton")?.addEventListener("click", () => {
  openPath(state.currentPath || state.session?.startPath || ".");
});

document.querySelector("#fileSearch")?.addEventListener("input", () => {
  renderFiles(getFilteredItems());
});

viewToggleBtn?.addEventListener("click", () => {
  state.isGridView = !state.isGridView;
  viewToggleBtn.textContent = state.isGridView ? "List" : "Grid";
  document.querySelector("#fileTable")?.classList.toggle("grid-view", state.isGridView);
  renderFiles(state.currentItems);
});

toggleHiddenBtn?.addEventListener("click", () => {
  state.showHiddenFiles = !state.showHiddenFiles;
  toggleHiddenBtn.classList.toggle("active", state.showHiddenFiles);
  renderFiles(getFilteredItems());
});

// 3. Sorting & Keyboard Navigation on File Table
document.querySelectorAll(".sort-header").forEach(header => {
  header.addEventListener("click", () => {
    sortFiles(header.dataset.sort);
  });
});

document.querySelector("#fileTable")?.addEventListener("keydown", (event) => {
  if (state.currentItems.length === 0) return;
  
  const items = state.currentItems;
  const primaryItem = getPrimarySelectedItem();
  let idx = primaryItem ? items.findIndex(item => item.name === primaryItem.name) : -1;
  
  if (event.key === "ArrowDown") {
    event.preventDefault();
    idx = Math.min(items.length - 1, idx + 1);
    if (idx === -1) idx = 0;
    state.selected.clear();
    state.selected.add(items[idx].name);
    state.lastSelectedIndex = idx;
    renderFiles(items);
    const rows = document.querySelector("#fileRows").querySelectorAll(".file-row");
    rows[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    idx = Math.max(0, idx - 1);
    state.selected.clear();
    state.selected.add(items[idx].name);
    state.lastSelectedIndex = idx;
    renderFiles(items);
    const rows = document.querySelector("#fileRows").querySelectorAll(".file-row");
    rows[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (primaryItem) {
      if (primaryItem.type === "dir") changePath(joinPath(state.currentPath, primaryItem.name));
      else openRemoteFile(joinPath(state.currentPath, primaryItem.name));
    }
  } else if (event.key === "Delete") {
    event.preventDefault();
    deleteSelectedItem();
  } else if (event.key === "F2") {
    event.preventDefault();
    renameSelectedItem();
  }
});

// 4. File Actions & Upload Drop Zones
document.querySelector("#openFileButton")?.addEventListener("click", openSelectedItem);
document.querySelector("#newFileButton")?.addEventListener("click", () => createFile("file"));
document.querySelector("#newFolderButton")?.addEventListener("click", () => createFile("dir"));
document.querySelector("#renameButton")?.addEventListener("click", renameSelectedItem);
document.querySelector("#deleteButton")?.addEventListener("click", deleteSelectedItem);
document.querySelector("#uploadButton")?.addEventListener("click", () => {
  localFilePicker?.click();
});
document.querySelector("#copySelectedButton")?.addEventListener("click", copySelected);

localFilePicker?.addEventListener("change", async () => {
  if (localFilePicker.files.length > 0) {
    await uploadLocalFiles(localFilePicker.files);
    localFilePicker.value = "";
  }
});

document.querySelector("#dropZone")?.addEventListener("click", () => {
  localFilePicker?.click();
});

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
  if (!state.session) {
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
        
        await request(`/api/sessions/${state.session.id}/upload`, {
          method: "POST",
          body: JSON.stringify({
            name: file.name,
            path: state.transferPath || state.session.startPath || ".",
            base64: base64
          })
        });
        
        updateTransferProgress(transferId, 100, "Completed");
        showToast(`Successfully uploaded "${file.name}"`, "success");
        
        if (state.transferPath === state.currentPath) {
          openPath(state.currentPath || ".");
        }
        if (state.transferPath === state.editorExplorerPath) {
          openEditorExplorerPath(state.editorExplorerPath || ".");
        }
      } catch (err) {
        updateTransferProgress(transferId, 100, "Failed", true);
        showToast(`Upload failed for "${file.name}": ${err.message}`, "error");
      }
    };
    reader.readAsDataURL(file);
  }
}

clearTransferHistory?.addEventListener("click", () => {
  document.querySelectorAll(".transfer-item").forEach(item => {
    const speed = item.querySelector(".transfer-speed");
    if (speed && (speed.textContent === "Finished" || speed.textContent === "Failed")) {
      item.remove();
    }
  });
});
document.querySelector("#transferUseFilesPath")?.addEventListener("click", () => {
  setTransferPath(state.currentPath || state.session?.startPath || ".");
});
document.querySelector("#transferUseEditorPath")?.addEventListener("click", () => {
  setTransferPath(state.editorExplorerPath || state.currentPath || state.session?.startPath || ".");
});
document.querySelector("#transferChoosePath")?.addEventListener("click", async () => {
  const nextPath = await window.osPrompt("Upload files to remote folder:", state.transferPath || state.currentPath || ".", "Set Upload Path");
  if (nextPath) setTransferPath(nextPath);
});

// 5. Monaco Ctrl+S Save hook
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
    e.preventDefault();
    focusWindow("editorWindow");
    setEditorWorkbenchView("explorer");
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === ",") {
    e.preventDefault();
    focusWindow("editorWindow");
    setEditorWorkbenchView("settings");
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    const activeWindow = document.querySelector(".focused");
    if (activeWindow && activeWindow.id === "editorWindow") {
      e.preventDefault();
      saveCurrentFile();
    }
  }
});

// 6. Terminal input keydowns
const terminalInputEl = document.querySelector("#terminalInput");
terminalInputEl?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    runTerminalCommand();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    state.commandHistoryIndex = Math.max(0, state.commandHistoryIndex - 1);
    terminalInputEl.value = state.commandHistory[state.commandHistoryIndex] || "";
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    state.commandHistoryIndex = Math.min(state.commandHistory.length, state.commandHistoryIndex + 1);
    terminalInputEl.value = state.commandHistory[state.commandHistoryIndex] || "";
  } else if (event.ctrlKey && event.key.toLowerCase() === "l") {
    event.preventDefault();
    state.logLines.length = 0;
    renderTerminalLog();
  } else if (event.ctrlKey && event.key.toLowerCase() === "c") {
    event.preventDefault();
    pushTerminal("^C", "stdout");
    terminalInputEl.value = "";
    state.commandHistoryIndex = state.commandHistory.length;
  } else if (event.key === "Tab") {
    event.preventDefault();
    const inputVal = terminalInputEl.value;
    const words = inputVal.split(" ");
    const lastWord = words[words.length - 1];
    if (!lastWord) return;

    const matches = state.allDirectoryItems
      .map(item => item.name)
      .filter(name => name.startsWith(lastWord));

    if (matches.length === 1) {
      words[words.length - 1] = matches[0];
      terminalInputEl.value = words.join(" ");
    } else if (matches.length > 1) {
      pushTerminal("");
      pushTerminal(matches.join("   "), "stdout");
      const promptPath = state.terminalCwd || state.session?.startPath || "~";
      const promptText = state.session ? `${state.session.username}@${state.session.host}:${promptPath} $` : "local $";
      pushTerminal(`${promptText} ${inputVal}`, "command");
    }
  }
});
document.querySelector("#runCommandButton")?.addEventListener("click", runTerminalCommand);

document.querySelector("#terminalBody")?.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  focusTerminalInputAtBottom();
});

function setTaskbarTooltipTarget(element, label) {
  if (!element || !label) return;
  element.dataset.tooltip = label;
  element.setAttribute("aria-label", label);
  element.removeAttribute("title");
}

function showTaskbarTooltip(target) {
  const label = target?.dataset.tooltip || target?.getAttribute("aria-label");
  if (!label) return;
  taskbarTooltip.textContent = label;
  taskbarTooltip.classList.remove("hidden");
  const rect = target.getBoundingClientRect();
  const tooltipRect = taskbarTooltip.getBoundingClientRect();
  const left = Math.min(
    window.innerWidth - tooltipRect.width - 10,
    Math.max(10, rect.left + rect.width / 2 - tooltipRect.width / 2),
  );
  const top = Math.max(10, rect.top - tooltipRect.height - 10);
  taskbarTooltip.style.left = `${left}px`;
  taskbarTooltip.style.top = `${top}px`;
}

function hideTaskbarTooltip() {
  taskbarTooltip.classList.add("hidden");
}

function initializeTaskbarTooltips() {
  setTaskbarTooltipTarget(document.querySelector(".start-button"), "Start");
  setTaskbarTooltipTarget(document.querySelector("#trayConnectionPill"), "SSH connection status");
  setTaskbarTooltipTarget(document.querySelector("#trayWifi"), "Network connection: Online");
  setTaskbarTooltipTarget(document.querySelector("#trayNotification"), "System notifications");

  document.querySelectorAll(".start-button, .task-app, .tray-icon").forEach((item) => {
    item.addEventListener("mouseenter", () => showTaskbarTooltip(item));
    item.addEventListener("focus", () => showTaskbarTooltip(item));
    item.addEventListener("mouseleave", hideTaskbarTooltip);
    item.addEventListener("blur", hideTaskbarTooltip);
    item.addEventListener("click", () => {
      hideTaskbarTooltip();
      setTimeout(() => {
        if (item.matches(":hover, :focus-visible")) showTaskbarTooltip(item);
      }, 180);
    });
  });

  document.addEventListener("mouseover", (event) => {
    const item = event.target.closest?.(".start-button, .task-app, .tray-icon");
    if (item) showTaskbarTooltip(item);
  });
  document.addEventListener("focusin", (event) => {
    const item = event.target.closest?.(".start-button, .task-app, .tray-icon");
    if (item) showTaskbarTooltip(item);
  });
  document.addEventListener("mouseout", (event) => {
    if (!event.target.closest?.(".start-button, .task-app, .tray-icon")) return;
    if (event.relatedTarget?.closest?.(".start-button, .task-app, .tray-icon")) return;
    hideTaskbarTooltip();
  });
}

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => {
    if (terminalInputEl) terminalInputEl.value = button.dataset.command;
    focusWindow("terminalWindow");
    terminalInputEl?.focus();
  });
});

// 7. Context Menus positionings & window actions
document.addEventListener("click", () => {
  document.querySelector("#fileContextMenu")?.classList.add("hidden");
  document.querySelector("#tabContextMenu")?.classList.add("hidden");
  document.querySelector("#taskbarContextMenu")?.classList.add("hidden");
  closeStartMenu();
});

document.querySelector("#fileContextOpen")?.addEventListener("click", () => {
  if (state.activeItemForFileContext) {
    const fullPath = joinPath(state.currentPath, state.activeItemForFileContext.name);
    if (state.activeItemForFileContext.type === "dir") changePath(fullPath);
    else openRemoteFile(fullPath);
  }
});
document.querySelector("#fileContextRename")?.addEventListener("click", renameSelectedItem);
document.querySelector("#fileContextDownload")?.addEventListener("click", copySelected);
document.querySelector("#fileContextDelete")?.addEventListener("click", deleteSelectedItem);
document.querySelector("#fileContextCopyPath")?.addEventListener("click", async () => {
  if (state.activeItemForFileContext) {
    const fullPath = joinPath(state.currentPath, state.activeItemForFileContext.name);
    await navigator.clipboard.writeText(fullPath);
    showToast("Path copied to clipboard", "success");
  }
});

// Editor tab context menus
document.querySelector("#tabContextClose")?.addEventListener("click", () => {
  if (state.activeTabForContext) closeEditorTab(state.activeTabForContext);
});
document.querySelector("#tabContextCloseOthers")?.addEventListener("click", async () => {
  const current = state.activeTabForContext;
  if (!current) return;
  for (const filePath of Array.from(state.openFiles.keys())) {
    if (filePath !== current) await closeEditorTab(filePath);
  }
});
document.querySelector("#tabContextCloseSaved")?.addEventListener("click", async () => {
  for (const [filePath, file] of Array.from(state.openFiles.entries())) {
    if (!file.dirty) await closeEditorTab(filePath);
  }
});
document.querySelector("#tabContextCloseAll")?.addEventListener("click", () => {
  document.querySelector("#editorCloseAllButton")?.click();
});

// Taskbar buttons clicks
document.querySelectorAll(".task-app").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.window;
    const windowEl = document.querySelector(`#${id}`);
    if (windowEl?.classList.contains("focused")) {
      minimizeWindow(id);
    } else {
      focusWindow(id);
    }
  });
});

// Desktop context menu triggers
const desktopContext = document.querySelector("#taskbarContextMenu");
document.querySelectorAll(".task-app").forEach((button) => {
  button.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    document.querySelector("#fileContextMenu")?.classList.add("hidden");
    document.querySelector("#tabContextMenu")?.classList.add("hidden");
    
    const id = button.dataset.window;
    const windowEl = document.querySelector(`#${id}`);
    const isClosed = windowEl?.classList.contains("closed");
    const isMin = windowEl?.classList.contains("minimized");
    
    const minimizeBtn = document.querySelector("#contextMinimize");
    const bringFrontBtn = document.querySelector("#contextBringFront");
    const maximizeBtn = document.querySelector("#contextMaximize");
    const closeBtn = document.querySelector("#contextClose");
    
    if (minimizeBtn) minimizeBtn.classList.toggle("disabled", isClosed || isMin);
    if (bringFrontBtn) bringFrontBtn.classList.toggle("disabled", isClosed);
    if (maximizeBtn) maximizeBtn.classList.toggle("disabled", isClosed);
    if (closeBtn) closeBtn.classList.toggle("disabled", isClosed);
    
    if (desktopContext) {
      desktopContext.dataset.window = id;
      desktopContext.style.left = `${event.clientX}px`;
      desktopContext.style.top = `${event.clientY - 80}px`;
      desktopContext.classList.remove("hidden");
    }
  });
});

document.querySelector("#contextMinimize")?.addEventListener("click", () => {
  if (desktopContext?.dataset.window) minimizeWindow(desktopContext.dataset.window);
});
document.querySelector("#contextBringFront")?.addEventListener("click", () => {
  if (desktopContext?.dataset.window) focusWindow(desktopContext.dataset.window);
});
document.querySelector("#contextMaximize")?.addEventListener("click", () => {
  if (desktopContext?.dataset.window) maximizeWindow(desktopContext.dataset.window);
});
document.querySelector("#contextClose")?.addEventListener("click", () => {
  if (desktopContext?.dataset.window) closeWindow(desktopContext.dataset.window);
});

// 8. Desktop Shell UI & Start Menu clicks
document.querySelector(".start-button")?.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleStartMenu();
});
document.querySelector("#startDisconnectButton")?.addEventListener("click", disconnectSession);

// Dynamic bindings for start menu recent apps
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-launch-window]");
  if (btn) {
    const id = btn.dataset.launchWindow;
    focusWindow(id);
    closeStartMenu(false);
  }
});

// Account dynamic event listeners update
document.addEventListener("recentFoldersUpdated", () => {
  renderWelcomeRecentFolders();
});

document.querySelector("#editorExplorerSearch")?.addEventListener("input", renderEditorExplorer);
document.querySelector("#editorRefreshExplorerButton")?.addEventListener("click", () => {
  openEditorExplorerPath(state.editorExplorerPath || state.currentPath || state.session?.startPath || ".");
});
document.querySelector("#editorNewFileButton")?.addEventListener("click", () => createFile("file"));
document.querySelector("#editorNewFolderButton")?.addEventListener("click", () => createFile("dir"));
document.querySelector("#editorCloseAllButton")?.addEventListener("click", async () => {
  for (const filePath of Array.from(state.openFiles.keys())) {
    await closeEditorTab(filePath);
  }
});
document.querySelector("#commandPaletteButton")?.addEventListener("click", () => openCommandPalette());
document.querySelector("#findReplaceButton")?.addEventListener("click", () => {
  focusWindow("editorWindow");
  state.editor?.getAction("actions.find")?.run();
});
document.querySelector("#themeToggleButton")?.addEventListener("click", toggleEditorTheme);
document.querySelector("#minimapToggleButton")?.addEventListener("click", toggleEditorMinimap);
document.querySelectorAll(".editor-activity-item").forEach((button) => {
  button.addEventListener("click", () => {
    setEditorWorkbenchView(button.dataset.editorView || "explorer");
    focusWindow("editorWindow");
  });
});
document.querySelector("#editorFontSizeSetting")?.addEventListener("change", (event) => {
  applyEditorFontSize(event.target.value);
});
document.querySelector("#editorMinimapSetting")?.addEventListener("change", (event) => {
  state.isEditorMinimapEnabled = Boolean(event.target.checked);
  localStorage.setItem("sshBridgeEditorMinimap", String(state.isEditorMinimapEnabled));
  state.editor?.updateOptions({ minimap: { enabled: state.isEditorMinimapEnabled } });
});
document.querySelector("#editorThemeSetting")?.addEventListener("change", (event) => {
  state.editorTheme = event.target.value;
  localStorage.setItem("sshBridgeEditorTheme", state.editorTheme);
  monaco?.editor?.setTheme(state.editorTheme);
  updateEditorThemeClass();
});
document.querySelector("#welcomeOpenFolderButton")?.addEventListener("click", () => {
  openEditorExplorerPath(state.editorExplorerPath || state.currentPath || state.session?.startPath || ".");
});
document.querySelector("#welcomeOpenFilesButton")?.addEventListener("click", () => focusWindow("filesWindow"));
document.querySelector("#welcomeCommandButton")?.addEventListener("click", () => openCommandPalette());
document.querySelector("#commandPaletteInput")?.addEventListener("input", (event) => {
  renderCommandPalette(document.querySelector("#commandPalette")?.dataset.mode || "command");
});
document.querySelector("#commandPaletteInput")?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeCommandPalette();
  } else if (event.key === "Enter") {
    event.preventDefault();
    document.querySelector("#commandPaletteList .command-item:not(.empty)")?.click();
  }
});

function renderWelcomeRecentFolders() {
  const container = document.querySelector("#welcomeRecentFolders");
  if (!container) return;
  container.innerHTML = "";
  const folders = getRecentEditorFolders();
  if (folders.length === 0) {
    container.innerHTML = `<span class="recent-empty">No folders opened recently</span>`;
    return;
  }
  folders.slice(0, 4).forEach((folder) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "welcome-recent-item";
    btn.innerHTML = `
      <span class="recent-icon">📁</span>
      <span class="recent-name" title="${folder}">${folder.split("/").pop()}</span>
    `;
    btn.addEventListener("click", () => {
      openEditorExplorerPath(folder);
    });
    container.append(btn);
  });
}

// 9. Window controls traffic actions
document.querySelectorAll("[data-close-window]").forEach((button) => {
  button.addEventListener("click", () => {
    closeWindow(button.dataset.closeWindow);
  });
});
document.querySelectorAll("[data-minimize-window]").forEach((button) => {
  button.addEventListener("click", () => {
    minimizeWindow(button.dataset.minimizeWindow);
  });
});
document.querySelectorAll("[data-maximize-window]").forEach((button) => {
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    maximizeWindow(button.dataset.maximizeWindow);
  });
});

// Custom settings controls
animationToggle?.addEventListener("change", (e) => {
  setAnimationEnabled(e.target.checked);
});

// Dynamic event details listeners
document.addEventListener("connectionDetailsUpdated", () => {
  updateConnectionDetails();
});

function syncConnectionStatusChrome(isConnected) {
  const statusLabel = isConnected ? "Connected" : "Disconnected";
  document.querySelectorAll(".connect-pill .status-dot, #trayConnectionPill .status-dot").forEach((dot) => {
    dot.classList.toggle("connected", isConnected);
    dot.classList.toggle("disconnected", !isConnected);
  });

  const detailStatus = document.querySelector("#detailStatus");
  if (detailStatus) detailStatus.textContent = statusLabel;

  const trayConnectionPill = document.querySelector("#trayConnectionPill");
  if (trayConnectionPill) {
    const tooltip = `SSH connection status: ${statusLabel}`;
    setTaskbarTooltipTarget(trayConnectionPill, tooltip);
  }
}

function updateConnectionDetails() {
  const details = document.querySelector("#connectionDetails");
  const connectionStateEl = document.querySelector("#connectionState");
  const hostVal = document.querySelector("#connectionHost");
  const distroVal = document.querySelector("#connectionDistro");
  const cipherVal = document.querySelector("#connectionCipher");
  
  if (state.session) {
    syncConnectionStatusChrome(true);
    const terminalWindow = document.querySelector("#terminalWindow");
    if (terminalWindow && !terminalWindow.classList.contains("minimized") && !terminalWindow.classList.contains("closed")) {
      attachTerminal();
    }
    if (connectionStateEl) {
      connectionStateEl.textContent = "Connected";
      connectionStateEl.dataset.tone = "success";
    }
    if (hostVal) hostVal.textContent = state.session.host;
    if (distroVal) distroVal.textContent = state.session.distro || "Linux Server";
    if (cipherVal) cipherVal.textContent = state.session.auth || "Key Handshake";
    
    // Details tab fields
    const dRemote = document.querySelector("#detailRemote");
    const dStart = document.querySelector("#detailStartPath");
    const dDist = document.querySelector("#detailDistro");
    const dShell = document.querySelector("#detailShell");
    
    if (dRemote) dRemote.textContent = `${state.session.username}@${state.session.host}`;
    if (dStart) dStart.textContent = state.session.startPath || ".";
    if (dDist) dDist.textContent = state.session.distro || "Linux Kernel";
    if (dShell) dShell.textContent = state.session.shell || "/bin/bash";
    
    // Header brandings
    const sTitle = document.querySelector("#sessionTitle");
    if (sTitle) sTitle.textContent = `${state.session.username}@${state.session.host}`;
    
    // Start menu account values
    const sAccName = document.querySelector("#startAccountName");
    const sAccHost = document.querySelector("#startAccountHost");
    const sAccDist = document.querySelector("#startAccountDistro");
    const sAccPath = document.querySelector("#startAccountPath");
    const sAvatar = document.querySelector("#startAvatar");
    
    if (sAccName) sAccName.textContent = state.session.username;
    if (sAccHost) sAccHost.textContent = state.session.host;
    if (sAccDist) sAccDist.textContent = state.session.distro || "Remote OS Bridge";
    if (sAccPath) sAccPath.textContent = state.session.startPath || "~";
    if (sAvatar) sAvatar.textContent = state.session.username.substring(0, 2).toUpperCase();
    
    if (disconnectButton) disconnectButton.classList.add("visible");
  } else {
    syncConnectionStatusChrome(false);
    detachTerminal();
    if (connectionStateEl) {
      connectionStateEl.textContent = "Offline";
      connectionStateEl.dataset.tone = "";
    }
    if (hostVal) hostVal.textContent = "None";
    if (distroVal) distroVal.textContent = "None";
    if (cipherVal) cipherVal.textContent = "None";
    
    const dRemote = document.querySelector("#detailRemote");
    const dStart = document.querySelector("#detailStartPath");
    const dDist = document.querySelector("#detailDistro");
    const dShell = document.querySelector("#detailShell");
    
    if (dRemote) dRemote.textContent = "Not connected";
    if (dStart) dStart.textContent = "Not connected";
    if (dDist) dDist.textContent = "Not connected";
    if (dShell) dShell.textContent = "Not connected";
    
    const sTitle = document.querySelector("#sessionTitle");
    if (sTitle) sTitle.textContent = "SSH OS Bridge";
    
    const sAccName = document.querySelector("#startAccountName");
    const sAccHost = document.querySelector("#startAccountHost");
    const sAccDist = document.querySelector("#startAccountDistro");
    const sAccPath = document.querySelector("#startAccountPath");
    const sAvatar = document.querySelector("#startAvatar");
    
    if (sAccName) sAccName.textContent = "Not Signed In";
    if (sAccHost) sAccHost.textContent = "SSH client bridge offline";
    if (sAccDist) sAccDist.textContent = "Start menu active";
    if (sAccPath) sAccPath.textContent = "/";
    if (sAvatar) sAvatar.textContent = "SSH";
    
    if (disconnectButton) disconnectButton.classList.remove("visible");
  }
}

// 10. Workspace Alt+Tab shortcut logic hooks
function isAppSwitcherShortcut(event) {
  const isBackquote = event.code === "Backquote" || event.key === "`" || event.key === "~";
  const isBestEffortAltTab = event.altKey && event.key === "Tab";
  return ((event.altKey || event.ctrlKey) && isBackquote) || isBestEffortAltTab;
}

window.addEventListener("keydown", (event) => {
  if (isAppSwitcherShortcut(event)) {
    event.preventDefault();
    state.altTabCloseKey = event.ctrlKey ? "Control" : "Alt";
    openAltTabSwitcher(event.shiftKey ? -1 : 1);
  } else if (state.isAltTabOpen && (event.key === "ArrowRight" || event.key === "ArrowDown")) {
    event.preventDefault();
    openAltTabSwitcher(1);
  } else if (state.isAltTabOpen && (event.key === "ArrowLeft" || event.key === "ArrowUp")) {
    event.preventDefault();
    openAltTabSwitcher(-1);
  } else if (event.key === "Escape") {
    if (state.isAltTabOpen) closeAltTabSwitcher(false);
    if (!document.querySelector("#connectPanel")?.classList.contains("hidden")) closeConnectionSurface();
    closeCommandPalette();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === state.altTabCloseKey || event.key === "Alt" || event.key === "Control") {
    closeAltTabSwitcher(true);
  }
});

// Setup Taskbar Alt Tab click bindings
document.querySelector("#altTabOverlay")?.addEventListener("click", () => {
  closeAltTabSwitcher(true);
});

// 11. Initializer Bootloaders
setInterval(() => {
  // const barTime = document.querySelector("#barTime");
  const taskbarTime = document.querySelector("#taskbarTime");
  const taskbarDate = document.querySelector("#taskbarDate");
  const time = formatTime();
  // if (barTime) barTime.textContent = time;
  if (taskbarTime) taskbarTime.textContent = time;
  if (taskbarDate) {
    taskbarDate.textContent = new Date().toLocaleDateString([], {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  }
}, 1000);

function keepBarOpenAfterLeave(element, openClass, closeDelay = 4500, options = {}) {
  if (!element) return null;
  let closeTimer = null;
  let isHovering = false;
  let isFocused = false;

  const openBar = () => {
    clearTimeout(closeTimer);
    element.classList.add(openClass);
  };

  const closeIfInactive = () => {
    if (options.closeOnIdle) {
      element.classList.remove(openClass);
      return;
    }
    if (!isHovering && !isFocused) element.classList.remove(openClass);
  };

  const scheduleClose = (delay = closeDelay) => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closeIfInactive, delay);
  };

  element.addEventListener("mouseenter", () => {
    isHovering = true;
    openBar();
    if (options.closeOnIdle) scheduleClose();
  });
  element.addEventListener("focusin", () => {
    isFocused = true;
    openBar();
    if (options.closeOnIdle) scheduleClose();
  });
  element.addEventListener("pointermove", () => {
    if (options.closeOnIdle) {
      openBar();
      scheduleClose();
    }
  });
  element.addEventListener("mouseleave", () => {
    isHovering = false;
    scheduleClose();
  });
  element.addEventListener("focusout", () => {
    isFocused = element.contains(document.activeElement);
    scheduleClose();
  });
  scheduleClose();

  return {
    revealTransient(delay = closeDelay) {
      openBar();
      scheduleClose(delay);
    },
    closeSoon(delay = 700) {
      scheduleClose(delay);
    },
  };
}

const workspaceBarAutoHide = keepBarOpenAfterLeave(workspaceBar, "bar-open");
const taskbarAutoHide = keepBarOpenAfterLeave(taskbarShell, "taskbar-open", 4000, { closeOnIdle: true });
document.querySelector(".remote-desktop")?.addEventListener("pointermove", (event) => {
  if (event.clientY <= 18) workspaceBarAutoHide?.revealTransient();
  else workspaceBarAutoHide?.closeSoon();

  if (window.innerHeight - event.clientY <= 24) taskbarAutoHide?.revealTransient();
});

// Drag observer layouts
new ResizeObserver(() => persistWindowLayout()).observe(document.querySelector(".remote-desktop"));
document.querySelectorAll(".window").forEach((windowEl) => {
  new ResizeObserver(() => {
    if (!windowEl.classList.contains("minimized") && !windowEl.classList.contains("closed")) persistWindowLayout();
  }).observe(windowEl);
});

// Monaco Config loaders
window.require.config({ paths: { vs: "./node_modules/monaco-editor/min/vs" } });
window.require(["vs/editor/editor.main"], () => {
  ensureEditor();
});

// Initialize session state
async function initializeSessionState() {
  loadSavedConnection();
  initializeNativeTerminal();
  updateConnectionDetails();
  renderFiles([], true);
  applySavedLayout();
  applyAnimationSetting();
  renderRecentApps();
  renderWelcomeRecentFolders();

  const hadSavedSession = Boolean(loadActiveSession());
  const restored = await restoreActiveSession();
  if (!restored && !state.session) {
    document.querySelector("#connectPanel")?.classList.remove("hidden");
    if (!hadSavedSession) startAutoConnect();
  }
  
  makeWindowsDraggable();
  makeWindowsResizable();
  initializeEditorExplorerResize();
  syncTaskbarState();
  initializeTaskbarTooltips();
  updateConnectionDetails();
}

initializeSessionState();

pushTerminal("SSH Bridge Tunnel Terminal [v1.0.0]");
pushTerminal("Type command options or click quick command pills below to execute.");
pushTerminal("Ready. Please sign in to establish a remote SSH session.");
pushTerminal("");
