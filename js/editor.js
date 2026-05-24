import { state } from './state.js';
import { escapeHtml, showToast } from './ui.js';
import { request } from './connection.js';
import { focusWindow } from './windowManager.js';

// DOM Selectors
const editorTabsEl = () => document.querySelector("#editorTabs");
const editorOpenListEl = () => document.querySelector("#editorOpenList");
const openFilePathLabelEl = () => document.querySelector("#openFilePath");
const editorStatusEl = () => document.querySelector("#editorStatus");
const saveFileButtonEl = () => document.querySelector("#saveFileButton");
const editorWelcomeEl = () => document.querySelector("#editorWelcome");
const editorWorkbenchEl = () => document.querySelector(".editor-workbench");
const editorFolderPathEl = () => document.querySelector("#editorFolderPath");
const editorFolderListEl = () => document.querySelector("#editorFolderList");
const editorExplorerSearchEl = () => document.querySelector("#editorExplorerSearch");
const commandPaletteEl = () => document.querySelector("#commandPalette");
const commandPaletteInputEl = () => document.querySelector("#commandPaletteInput");
const commandPaletteListEl = () => document.querySelector("#commandPaletteList");
const editorCursorPosEl = () => document.querySelector("#editorCursorPos");
const editorLanguageEl = () => document.querySelector("#editorLanguage");
const editorIndentEl = () => document.querySelector("#editorIndent");
const editorEncodingEl = () => document.querySelector("#editorEncoding");

let defineM2ThemeDone = false;
export const editorThemes = ["m2-dark", "vs-dark", "vs"];

function joinRemotePath(basePath, name) {
  const base = basePath || state.currentPath || ".";
  if (base === "/") return `/${name}`;
  return `${base.replace(/\/$/, "")}/${name}`;
}

function getEditorFileIcon(name, isDir) {
  if (isDir) return "";
  const ext = name.split(".").pop().toLowerCase();
  const iconMap = {
    css: "#",
    js: "JS",
    json: "{}",
    html: "<>",
    md: "MD",
    gitignore: "G",
  };
  return iconMap[ext] || iconMap[name.toLowerCase()] || "";
}

function getEditorFileStatus(path) {
  const file = state.openFiles.get(path);
  if (file?.dirty) return "M";
  if (file) return "O";
  return "";
}

export function defineM2MonacoTheme() {
  if (!window.monaco || defineM2ThemeDone) return;
  monaco.editor.defineTheme("m2-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "d4d4d4" },
      { token: "comment", foreground: "6a9955", fontStyle: "italic" },
      { token: "keyword", foreground: "569cd6", fontStyle: "bold" },
      { token: "string", foreground: "ce9178" },
      { token: "number", foreground: "b5cea8" },
      { token: "regexp", foreground: "d16969" },
      { token: "type", foreground: "4ec9b0" },
      { token: "class", foreground: "4ec9b0" },
      { token: "function", foreground: "dcdcaa" },
      { token: "variable", foreground: "9cdcfe" },
    ],
    colors: {
      "editor.background": "#0f1620",
      "editor.foreground": "#d4d4d4",
      "editorCursor.foreground": "#74d89a",
      "editor.lineHighlightBackground": "#162232",
      "editorLineNumber.foreground": "#4b596d",
      "editorLineNumber.activeForeground": "#74d89a",
      "editor.selectionBackground": "#263b55",
      "editor.inactiveSelectionBackground": "#1b2c40",
    },
  });
  defineM2ThemeDone = true;
}

export function ensureEditor() {
  if (state.editor || !window.monaco) return state.editor;
  defineM2MonacoTheme();
  const editorHost = document.querySelector("#monacoEditor");
  state.editor = monaco.editor.create(editorHost, {
    value: "",
    language: "plaintext",
    theme: state.editorTheme,
    automaticLayout: true,
    minimap: { enabled: state.isEditorMinimapEnabled },
    fontSize: 13,
    lineHeight: 21,
    scrollBeyondLastLine: false,
    wordWrap: "on",
    bracketPairColorization: { enabled: true },
    guides: { bracketPairs: true, indentation: true },
    quickSuggestions: true,
    suggestOnTriggerCharacters: true,
  });
  
  state.editor.addAction({
    id: "ssh-bridge-command-palette",
    label: "Command Palette",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP],
    run: () => openCommandPalette(),
  });
  state.editor.addAction({
    id: "ssh-bridge-open-file-palette",
    label: "Open File",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP],
    run: () => openCommandPalette("file"),
  });
  state.editor.addAction({
    id: "ssh-bridge-toggle-theme",
    label: "Toggle Editor Theme",
    run: () => toggleEditorTheme(),
  });
  state.editor.addAction({
    id: "ssh-bridge-toggle-minimap",
    label: "Toggle Minimap",
    run: () => toggleEditorMinimap(),
  });

  state.editor.onDidChangeCursorPosition(updateEditorStatusBar);
  state.editor.onDidChangeCursorSelection(updateEditorStatusBar);
  state.editor.onDidChangeModelContent(updateEditorStatusBar);
  state.editor.onDidChangeModel(updateEditorStatusBar);

  new ResizeObserver(() => state.editor?.layout()).observe(editorHost);
  const wEl = document.querySelector("#editorWindow");
  if (wEl) new ResizeObserver(() => state.editor?.layout()).observe(wEl);
  updateEditorWelcome();
  updateEditorToolbarState();
  updateEditorStatusBar();
  return state.editor;
}

export function renderEditorTabs() {
  const tabs = editorTabsEl();
  if (!tabs) return;
  tabs.innerHTML = "";
  const openList = editorOpenListEl();
  if (openList) openList.innerHTML = "";
  
  state.openFiles.forEach((file, filePath) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `editor-tab ${filePath === state.openFilePath ? "active" : ""} ${file.dirty ? "dirty" : ""}`;
    tab.title = filePath;
    const dirtyDot = document.createElement("span");
    dirtyDot.className = "dirty-dot";
    const name = document.createElement("span");
    name.className = "tab-name";
    name.textContent = filePath.split("/").pop() || filePath;
    const close = document.createElement("span");
    close.className = "tab-close";
    close.innerHTML = "&times;";
    
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      closeEditorTab(filePath);
    });
    
    tab.append(dirtyDot, name, close);
    tab.addEventListener("click", () => switchEditorTab(filePath));
    
    tab.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      state.activeTabForContext = filePath;
      const menu = document.querySelector("#tabContextMenu");
      if (menu) {
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        menu.classList.remove("hidden");
      }
    });

    tabs.append(tab);
    
    if (openList) {
      const li = document.createElement("li");
      li.className = filePath === state.openFilePath ? "active" : "";
      li.innerHTML = `
        <span class="explorer-file-icon">ðŸ“„</span>
        <span class="explorer-file-name" title="${filePath}">${filePath.split("/").pop()}</span>
      `;
      li.addEventListener("click", () => switchEditorTab(filePath));
      openList.append(li);
    }
  });
  
  updateEditorToolbarState();
}

export function switchEditorTab(filePath) {
  const file = state.openFiles.get(filePath);
  const activeEditor = ensureEditor();
  if (!file || !activeEditor) return;
  state.openFilePath = filePath;
  activeEditor.setModel(file.model);
  const label = openFilePathLabelEl();
  if (label) label.textContent = filePath;
  const status = editorStatusEl();
  if (status) status.textContent = file.dirty ? "Unsaved changes" : "Loaded";
  const saveBtn = saveFileButtonEl();
  if (saveBtn) saveBtn.disabled = !file.dirty;
  
  updateEditorStatusBar();
  renderEditorTabs();
  updateEditorWelcome();
  setTimeout(() => activeEditor.layout(), 40);
}

export async function closeEditorTab(filePath) {
  const file = state.openFiles.get(filePath);
  if (!file) return;
  if (file.dirty) {
    const confirmed = await window.osConfirm(`Discard unsaved changes in ${filePath}?`, "Unsaved Changes");
    if (!confirmed) return;
  }
  file.model.dispose();
  state.openFiles.delete(filePath);
  if (state.openFilePath === filePath) {
    const nextPath = state.openFiles.keys().next().value;
    if (nextPath) {
      switchEditorTab(nextPath);
    } else {
      state.openFilePath = "";
      ensureEditor()?.setModel(null);
      const label = openFilePathLabelEl();
      if (label) label.textContent = "Open a remote file";
      const status = editorStatusEl();
      if (status) status.textContent = "Read/write over SFTP";
      const saveBtn = saveFileButtonEl();
      if (saveBtn) saveBtn.disabled = true;
      if (editorCursorPosEl()) editorCursorPosEl().textContent = "Ln 1, Col 1";
      if (editorLanguageEl()) editorLanguageEl().textContent = "Plain Text";
      renderEditorTabs();
      updateEditorWelcome();
    }
  } else {
    renderEditorTabs();
  }
}

export async function openRemoteFile(filePath) {
  if (!state.session) return;
  focusWindow("editorWindow");
  if (state.openFiles.has(filePath)) {
    switchEditorTab(filePath);
    return;
  }
  if (!window.monaco) {
    showToast("Editor is still loading. Try opening the file again in a moment.", "info");
    return;
  }
  showToast(`Loading ${filePath.split("/").pop()}...`, "info");
  try {
    const data = await request(`/api/sessions/${state.session.id}/file?path=${encodeURIComponent(filePath)}`);
    const model = monaco.editor.createModel(data.contents, inferLanguage(data.path));
    
    model.onDidChangeContent(() => {
      const f = state.openFiles.get(filePath);
      if (f && !f.dirty) {
        f.dirty = true;
        const status = editorStatusEl();
        if (status) status.textContent = "Unsaved changes";
        const saveBtn = saveFileButtonEl();
        if (saveBtn) saveBtn.disabled = false;
        renderEditorTabs();
      }
    });

    state.openFiles.set(filePath, { model, dirty: false });
    switchEditorTab(filePath);
  } catch (error) {
    showToast(`Failed to open file: ${error.message}`, "error");
  }
}

export async function saveCurrentFile() {
  if (!state.openFilePath || !state.session) return;
  const file = state.openFiles.get(state.openFilePath);
  if (!file) return;
  
  const status = editorStatusEl();
  if (status) status.textContent = "Saving...";
  try {
    await request(`/api/sessions/${state.session.id}/file`, {
      method: "PUT",
      body: JSON.stringify({ path: state.openFilePath, contents: file.model.getValue() }),
    });
    file.dirty = false;
    if (status) status.textContent = "Saved";
    const saveBtn = saveFileButtonEl();
    if (saveBtn) saveBtn.disabled = true;
    renderEditorTabs();
  } catch (error) {
    if (status) status.textContent = error.message;
  }
}

export function updateEditorWelcome() {
  const hasOpenFile = state.openFilePath !== "";
  editorWelcomeEl()?.classList.toggle("hidden", hasOpenFile);
  const editorHost = document.querySelector("#monacoEditor");
  if (editorHost) editorHost.classList.toggle("hidden", !hasOpenFile);
  const workbench = editorWorkbenchEl();
  if (workbench) workbench.classList.toggle("welcome-active", !hasOpenFile);
}

export function updateEditorToolbarState() {
  const hasOpenFile = state.openFilePath !== "";
  const saveBtn = saveFileButtonEl();
  if (saveBtn) {
    if (!hasOpenFile) {
      saveBtn.disabled = true;
    } else {
      const file = state.openFiles.get(state.openFilePath);
      saveBtn.disabled = !file || !file.dirty;
    }
  }
}

export function initializeEditorExplorerResize() {
  const splitter = document.querySelector("#editorSplitter");
  const workbench = editorWorkbenchEl();
  if (!splitter || !workbench) return;

  const minWidth = 170;
  const maxWidth = 420;

  const setExplorerWidth = (clientX) => {
    const rect = workbench.getBoundingClientRect();
    const width = Math.min(maxWidth, Math.max(minWidth, clientX - rect.left));
    workbench.style.setProperty("--editor-explorer-width", `${Math.round(width)}px`);
    state.editor?.layout();
  };

  splitter.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    splitter.setPointerCapture?.(event.pointerId);
    workbench.classList.add("resizing-explorer");
    setExplorerWidth(event.clientX);

    const onPointerMove = (moveEvent) => setExplorerWidth(moveEvent.clientX);
    const onPointerUp = () => {
      workbench.classList.remove("resizing-explorer");
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      state.editor?.layout();
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp, { once: true });
  });
}

export function resetEditorExplorerWidth() {
  editorWorkbenchEl()?.style.removeProperty("--editor-explorer-width");
  state.editor?.layout();
}

export function inferLanguage(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  const map = {
    js: "javascript",
    ts: "typescript",
    json: "json",
    py: "python",
    sh: "shell",
    html: "html",
    css: "css",
    md: "markdown",
    rs: "rust",
    go: "go",
    cpp: "cpp",
    c: "c",
    h: "cpp",
    java: "java",
    yml: "yaml",
    yaml: "yaml",
    xml: "xml",
  };
  return map[ext] || "plaintext";
}

export function formatLanguageLabel(language) {
  const map = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    json: "JSON",
    python: "Python",
    shell: "Bash",
    html: "HTML",
    css: "CSS",
    markdown: "Markdown",
    rust: "Rust",
    go: "Go",
    cpp: "C++",
    c: "C",
    java: "Java",
    yaml: "YAML",
    xml: "XML",
    plaintext: "Plain Text",
  };
  return map[language] || "Plain Text";
}

export function updateEditorStatusBar() {
  const activeEditor = state.editor;
  if (!activeEditor) return;
  const model = activeEditor.getModel();
  if (!model) return;

  const position = activeEditor.getPosition();
  if (position) {
    const pos = editorCursorPosEl();
    if (pos) pos.textContent = `Ln ${position.lineNumber}, Col ${position.column}`;
  }

  const lang = editorLanguageEl();
  if (lang) lang.textContent = formatLanguageLabel(model.getLanguageId());
  
  const indent = editorIndentEl();
  if (indent) {
    const opts = model.getOptions();
    indent.textContent = `Spaces: ${opts.tabSize}`;
  }
  
  const enc = editorEncodingEl();
  if (enc) enc.textContent = "UTF-8";
}

export async function openEditorExplorerPath(path) {
  if (!state.session) return;
  state.editorExplorerPath = path;
  state.editorExplorerExpanded.clear();
  state.editorExplorerLoading.clear();
  
  const folderPath = editorFolderPathEl();
  if (folderPath) folderPath.textContent = path.split("/").pop() || path;
  
  try {
    const data = await request(`/api/sessions/${state.session.id}/list?path=${encodeURIComponent(path)}`);
    state.editorExplorerItems = data.items;
    state.editorExplorerTreeCache.set(path, data.items);
    renderEditorExplorer();
  } catch (err) {
    showToast(`Failed to open explorer path: ${err.message}`, "error");
  }
}

async function toggleEditorFolder(path) {
  if (state.editorExplorerExpanded.has(path)) {
    state.editorExplorerExpanded.delete(path);
    renderEditorExplorer();
    return;
  }

  state.editorExplorerExpanded.add(path);
  if (!state.editorExplorerTreeCache.has(path)) {
    state.editorExplorerLoading.add(path);
    renderEditorExplorer();
    try {
      const data = await request(`/api/sessions/${state.session.id}/list?path=${encodeURIComponent(path)}`);
      state.editorExplorerTreeCache.set(path, data.items);
    } catch (err) {
      state.editorExplorerExpanded.delete(path);
      showToast(`Failed to expand folder: ${err.message}`, "error");
    } finally {
      state.editorExplorerLoading.delete(path);
    }
  }
  renderEditorExplorer();
}

function renderEditorTreeItems(container, items, basePath, depth, query) {
  const visibleItems = query
    ? items.filter(item => item.name.toLowerCase().includes(query))
    : items;

  visibleItems.forEach((item) => {
    const isDir = item.type === "dir";
    const fullPath = joinRemotePath(basePath, item.name);
    const expanded = isDir && state.editorExplorerExpanded.has(fullPath);
    const loading = isDir && state.editorExplorerLoading.has(fullPath);
    const row = document.createElement("button");
    row.type = "button";
    const ext = isDir ? "folder" : (item.name.split(".").pop().toLowerCase() || "file");
    row.className = `editor-folder-item ${isDir ? "folder" : "file"} ext-${ext} ${expanded ? "expanded" : ""}`;
    row.style.setProperty("--tree-depth", String(depth));
    row.title = fullPath;
    row.dataset.expanded = expanded ? "true" : "false";
    row.innerHTML = `
      <span class="editor-tree-twist" aria-hidden="true"></span>
      <span class="editor-tree-icon">${escapeHtml(getEditorFileIcon(item.name, isDir))}</span>
      <span class="editor-tree-name">${escapeHtml(item.name)}</span>
      <span class="editor-tree-state">${loading ? "..." : escapeHtml(getEditorFileStatus(fullPath))}</span>
    `;

    row.addEventListener("click", () => {
      if (isDir) toggleEditorFolder(fullPath);
      else openRemoteFile(fullPath);
    });

    container.append(row);

    if (!expanded) return;
    if (loading) return;

    const children = state.editorExplorerTreeCache.get(fullPath) || [];
    if (children.length === 0) {
      const empty = document.createElement("div");
      empty.className = "editor-tree-empty";
      empty.style.setProperty("--tree-depth", String(depth + 1));
      empty.textContent = "Empty folder";
      container.append(empty);
      return;
    }

    renderEditorTreeItems(container, children, fullPath, depth + 1, query);
  });
}

export function renderEditorExplorer() {
  const container = editorFolderListEl();
  if (!container) return;
  container.innerHTML = "";
  
  if (!state.session) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Connect to SSH to view files";
    container.append(li);
    return;
  }

  const searchInput = editorExplorerSearchEl();
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const treeItems = state.editorExplorerTreeCache.get(state.editorExplorerPath) || state.editorExplorerItems;
  if (treeItems.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No items in folder";
    container.append(li);
    return;
  }

  renderEditorTreeItems(container, treeItems, state.editorExplorerPath, 0, query);
  if (!container.children.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No items match search";
    container.append(li);
  }
}

export function toggleEditorTheme() {
  const idx = editorThemes.indexOf(state.editorTheme);
  const nextIdx = (idx + 1) % editorThemes.length;
  state.editorTheme = editorThemes[nextIdx];
  localStorage.setItem("sshBridgeEditorTheme", state.editorTheme);
  monaco?.editor?.setTheme(state.editorTheme);
  showToast(`Editor theme changed to ${state.editorTheme}`, "info");
}

export function toggleEditorMinimap() {
  state.isEditorMinimapEnabled = !state.isEditorMinimapEnabled;
  localStorage.setItem("sshBridgeEditorMinimap", state.isEditorMinimapEnabled);
  state.editor?.updateOptions({ minimap: { enabled: state.isEditorMinimapEnabled } });
  showToast(`Editor minimap ${state.isEditorMinimapEnabled ? "enabled" : "disabled"}`, "info");
}

export function openCommandPalette(mode = "command") {
  ensureEditor();
  const palette = commandPaletteEl();
  if (palette) {
    palette.classList.remove("hidden");
    palette.dataset.mode = mode;
  }
  const input = commandPaletteInputEl();
  if (input) {
    input.value = mode === "file" ? "" : ">";
  }
  renderCommandPalette(mode);
  setTimeout(() => {
    if (input) {
      input.focus();
      input.select();
    }
  }, 20);
}

export function closeCommandPalette() {
  commandPaletteEl()?.classList.add("hidden");
  state.editor?.focus();
}

export function renderCommandPalette(mode = "command") {
  const container = commandPaletteListEl();
  if (!container) return;
  container.innerHTML = "";
  
  const inputVal = commandPaletteInputEl()?.value || "";
  
  if (mode === "file") {
    // File search mode
    let list = state.editorExplorerItems.filter(item => item.type !== "dir");
    if (inputVal) {
      list = list.filter(item => item.name.toLowerCase().includes(inputVal.toLowerCase().trim()));
    }
    
    if (list.length === 0) {
      container.innerHTML = `<div class="command-item empty">No files match your query</div>`;
      return;
    }
    
    list.slice(0, 10).forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `command-item ${index === 0 ? "active" : ""}`;
      button.innerHTML = `
        <span class="command-icon">ðŸ“„</span>
        <div class="command-meta">
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(state.editorExplorerPath || ".")}/${escapeHtml(item.name)}</small>
        </div>
      `;
      button.addEventListener("click", () => {
        closeCommandPalette();
        const fullPath = joinRemotePath(state.editorExplorerPath || state.currentPath || ".", item.name);
        openRemoteFile(fullPath);
      });
      container.append(button);
    });
  } else {
    // Command actions mode
    const commandsList = [
      { id: "save", name: "File: Save Current", desc: "Write editor contents over SFTP", icon: "ðŸ’¾", action: () => saveCurrentFile() },
      { id: "close", name: "File: Close Tab", desc: "Close the currently focused file", icon: "âœ•", action: () => closeEditorTab(state.openFilePath) },
      { id: "closeAll", name: "File: Close All Tabs", desc: "Close all active editor files", icon: "ðŸ§¹", action: () => document.querySelector("#editorCloseAllButton")?.click() },
      { id: "theme", name: "Preferences: Toggle Theme", desc: "Toggle VS Light, VS Dark, and M2 Theme", icon: "ðŸŽ¨", action: () => toggleEditorTheme() },
      { id: "minimap", name: "Preferences: Toggle Minimap", desc: "Show or hide the side scroll bar minimap", icon: "ðŸ”", action: () => toggleEditorMinimap() },
    ];
    
    const filterQuery = inputVal.startsWith(">") ? inputVal.substring(1).trim().toLowerCase() : inputVal.trim().toLowerCase();
    const filtered = commandsList.filter(cmd => cmd.name.toLowerCase().includes(filterQuery) || cmd.desc.toLowerCase().includes(filterQuery));
    
    if (filtered.length === 0) {
      container.innerHTML = `<div class="command-item empty">No commands match your query</div>`;
      return;
    }
    
    filtered.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `command-item ${index === 0 ? "active" : ""}`;
      button.innerHTML = `
        <span class="command-icon">${item.icon}</span>
        <div class="command-meta">
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.desc)}</small>
        </div>
      `;
      button.addEventListener("click", () => {
        closeCommandPalette();
        item.action();
      });
      container.append(button);
    });
  }
}
