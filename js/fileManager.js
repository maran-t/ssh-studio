import { state } from './state.js';
import { showToast, renderSkeleton } from './ui.js';
import { request, saveActiveSession } from './connection.js';
import { focusWindow } from './windowManager.js';
import { addTransferQueue, updateTransferProgress } from './transfers.js';
import { openRemoteFile, renderEditorExplorer } from './editor.js';

// DOM Selectors
const breadcrumbsEl = () => document.querySelector("#breadcrumbs");
const fileRowsEl = () => document.querySelector("#fileRows");
const pathTitleEl = () => document.querySelector("#pathTitle");
const itemCountEl = () => document.querySelector("#itemCount");
const selectionCountEl = () => document.querySelector("#selectionCount");
const fileSearchEl = () => document.querySelector("#fileSearch");
const uploadDestPathEl = () => document.querySelector("#uploadDestPath");
const fileContextMenuEl = () => document.querySelector("#fileContextMenu");
const contextMenuEl = () => document.querySelector("#taskbarContextMenu");

export function joinPath(base, name) {
  if (base === "/") return `/${name}`;
  return `${base.replace(/\/$/, "")}/${name}`;
}

export function renderBreadcrumbs() {
  const breadcrumbs = breadcrumbsEl();
  if (!breadcrumbs) return;
  breadcrumbs.innerHTML = "";
  breadcrumbs.classList.toggle("hidden", !state.currentPath);
  if (!state.currentPath) return;

  const normalized = state.currentPath.startsWith("/") ? state.currentPath : `/${state.currentPath}`;
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

  const crumbs = breadcrumbs.querySelectorAll(".crumb");
  if (crumbs.length > 0) {
    crumbs[crumbs.length - 1].classList.add("crumb-active");
  }
}

export function makeCell(text, className = "") {
  const span = document.createElement("span");
  if (className) span.className = className;
  span.textContent = text;
  return span;
}

export function getSelectedItems() {
  return state.currentItems.filter((item) => state.selected.has(item.name));
}

export function getPrimarySelectedItem() {
  return getSelectedItems()[0] || null;
}

export function getFileIconInfo(name, type) {
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

export function getFilteredItems() {
  let list = state.allDirectoryItems;
  if (!state.showHiddenFiles) {
    list = list.filter(item => !item.name.startsWith("."));
  }
  const fileSearch = fileSearchEl();
  const query = fileSearch ? fileSearch.value.toLowerCase().trim() : "";
  if (query) {
    list = list.filter(item => item.name.toLowerCase().includes(query));
  }
  return list;
}

export function renderFiles(items = getFilteredItems(), updateCache = false) {
  if (updateCache) {
    state.allDirectoryItems = items;
  }
  
  const displayItems = updateCache ? getFilteredItems() : items;
  state.currentItems = displayItems;
  
  const pTitle = pathTitleEl();
  if (pTitle) pTitle.textContent = state.currentPath || "Connect to browse";
  
  const totalVisible = state.allDirectoryItems.filter(item => state.showHiddenFiles || !item.name.startsWith(".")).length;
  const fileSearch = fileSearchEl();
  const query = fileSearch ? fileSearch.value.toLowerCase().trim() : "";
  
  const itemC = itemCountEl();
  if (itemC) {
    if (query) {
      itemC.textContent = `${displayItems.length} of ${totalVisible} items`;
    } else {
      itemC.textContent = `${totalVisible} items`;
    }
  }
  
  const selC = selectionCountEl();
  if (selC) selC.textContent = `${state.selected.size} selected`;
  
  const rows = fileRowsEl();
  if (!rows) return;
  rows.innerHTML = "";
  renderEditorExplorer();

  if (!state.session) {
    const row = document.createElement("div");
    row.className = "empty-row";
    row.textContent = "Enter SSH details to browse remote folders.";
    rows.append(row);
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
    rows.append(emptyContainer);
    renderBreadcrumbs();
    return;
  }

  displayItems.forEach((item, index) => {
    const row = document.createElement("button");
    row.type = "button";
    row.setAttribute("role", "row");
    row.className = `file-row file-entry ${state.selected.has(item.name) ? "selected" : ""}`;

    const iconInfo = getFileIconInfo(item.name, item.type);

    const nameCell = makeCell("", "file-name");
    const icon = makeCell(iconInfo.symbol, `file-icon ${iconInfo.className}`);
    const label = makeCell(item.name, "file-label");
    label.title = item.name;
    nameCell.append(icon, label);

    row.append(nameCell, makeCell(item.type), makeCell(item.size), makeCell(item.modified));
    
    row.addEventListener("dblclick", () => {
      if (item.type === "dir") changePath(joinPath(state.currentPath, item.name));
      else openRemoteFile(joinPath(state.currentPath, item.name));
    });
    
    row.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey) {
        if (state.selected.has(item.name)) state.selected.delete(item.name);
        else state.selected.add(item.name);
        state.lastSelectedIndex = index;
      } else if (event.shiftKey && state.lastSelectedIndex !== -1) {
        state.selected.clear();
        const startIdx = Math.min(state.lastSelectedIndex, index);
        const endIdx = Math.max(state.lastSelectedIndex, index);
        for (let i = startIdx; i <= endIdx; i++) {
          state.selected.add(displayItems[i].name);
        }
      } else {
        state.selected.clear();
        state.selected.add(item.name);
        state.lastSelectedIndex = index;
      }
      renderFiles(displayItems);
    });

    row.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      if (!state.selected.has(item.name)) {
        state.selected.clear();
        state.selected.add(item.name);
        state.lastSelectedIndex = index;
        renderFiles(displayItems);
      }
      
      state.activeItemForFileContext = item;
      
      contextMenuEl()?.classList.add("hidden");
      
      const fileMenu = fileContextMenuEl();
      if (fileMenu) {
        fileMenu.style.left = `${event.clientX}px`;
        fileMenu.style.top = `${event.clientY}px`;
        fileMenu.classList.remove("hidden");
      }
    });

    rows.append(row);
  });

  renderBreadcrumbs();
}

export async function runFileAction(action, payload = {}) {
  if (!state.session) return;
  const p = payload.path || state.currentPath;
  const response = await request(`/api/sessions/${state.session.id}/file-action`, {
    method: "POST",
    body: JSON.stringify({ action, path: p, ...payload }),
  });
  if (payload.updateFileExplorer !== false) {
    renderFiles(response.items, true);
  }
}

export function openSelectedItem() {
  const item = getPrimarySelectedItem();
  if (!item) return;
  if (item.type === "dir") changePath(joinPath(state.currentPath, item.name));
  else openRemoteFile(joinPath(state.currentPath, item.name));
}

export async function createFile(type) {
  const typeLabel = type === "dir" ? "folder" : "file";
  const action = type === "dir" ? "new-folder" : "new-file";
  const name = await window.osPrompt(`Enter new ${typeLabel} name:`, `new-${typeLabel}`, `Create ${typeLabel}`);
  if (!name) return;
  try {
    await runFileAction(action, { name });
    showToast(`Successfully created ${typeLabel} "${name}"`, "success");
  } catch (err) {
    showToast(`Failed to create: ${err.message}`, "error");
  }
}

export async function renameSelectedItem() {
  const item = getPrimarySelectedItem();
  if (!item) return;
  const targetName = await window.osPrompt(`Rename "${item.name}" to:`, item.name, "Rename Item");
  if (!targetName || targetName === item.name) return;
  try {
    await runFileAction("rename", { name: item.name, targetName });
    showToast(`Successfully renamed "${item.name}" to "${targetName}"`, "success");
  } catch (err) {
    showToast(`Failed to rename: ${err.message}`, "error");
  }
}

export async function deleteSelectedItem() {
  const item = getPrimarySelectedItem();
  if (!item) {
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

export async function changePath(path, pushHistory = true) {
  if (pushHistory && state.currentPath) {
    state.pathHistoryBack.push(state.currentPath);
    state.pathHistoryForward = [];
  }
  await openPath(path);
  const back = document.querySelector("#backButton");
  const forward = document.querySelector("#forwardButton");
  if (back) back.disabled = state.pathHistoryBack.length === 0;
  if (forward) forward.disabled = state.pathHistoryForward.length === 0;
}

export async function openPath(path) {
  const searchInput = fileSearchEl();
  if (searchInput) searchInput.value = ""; 
  if (!state.session) {
    const conn = document.querySelector("#connectPanel");
    if (conn) conn.classList.remove("hidden");
    focusWindow("settingsWindow");
    return;
  }

  renderSkeleton();
  try {
    const data = await request(`/api/sessions/${state.session.id}/list?path=${encodeURIComponent(path)}`);
    state.currentPath = data.path;
    state.terminalCwd = data.path;
    state.selected.clear();
    saveActiveSession(state.currentPath);
    renderFiles(data.items, true);
  } catch (err) {
    showToast(`Failed to open path: ${err.message}`, "error");
    renderFiles([], true);
  }
}

export function sortFiles(column) {
  if (state.currentSortColumn === column) {
    state.currentSortDirection = state.currentSortDirection === "asc" ? "desc" : "asc";
  } else {
    state.currentSortColumn = column;
    state.currentSortDirection = "asc";
  }

  const sorted = [...state.allDirectoryItems].sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    let comparison = 0;
    if (column === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (column === "size") {
      const parseSize = (str) => {
        if (str === "-") return -1;
        const scale = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
        const match = str.match(/^([0-9.]+)\s*(B|KB|MB|GB)/i);
        if (!match) return 0;
        return parseFloat(match[1]) * (scale[match[2].toUpperCase()] || 1);
      };
      comparison = parseSize(a.size) - parseSize(b.size);
    } else if (column === "modified") {
      comparison = new Date(a.modified) - new Date(b.modified);
    }
    return state.currentSortDirection === "asc" ? comparison : -comparison;
  });

  renderFiles(sorted);
}

export async function copySelected() {
  if (!state.session) {
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
    
    const remotePath = joinPath(state.currentPath, item.name);
    const transferId = addTransferQueue(item.name, "Download");
    
    try {
      updateTransferProgress(transferId, 0, "Starting download...");
      
      const downloadUrl = `/api/sessions/${state.session.id}/download?path=${encodeURIComponent(remotePath)}`;
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

  state.selected.clear();
  renderFiles();
}
