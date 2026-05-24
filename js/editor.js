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
const editorSettingsWorkbenchEl = () => document.querySelector("#editorSettingsWorkbench");
const editorKeybindingsWorkbenchEl = () => document.querySelector("#editorKeybindingsWorkbench");
const editorFontSizeSettingEl = () => document.querySelector("#editorFontSizeSetting");
const editorMinimapSettingEl = () => document.querySelector("#editorMinimapSetting");
const editorThemeSettingEl = () => document.querySelector("#editorThemeSetting");

let defineM2ThemeDone = false;
export const editorThemes = ["m2-dark", "vs-dark", "vs"];

function applyVSCodeWorkbenchLabels() {
  const activityItems = document.querySelectorAll(".editor-activity-item");
  activityItems.forEach((item) => {
    const view = item.dataset.editorView;
    item.textContent = "";
    if (view === "explorer") {
      item.innerHTML = `
        <svg class="activity-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width: 26px; height: 26px;">
          <path d="M16 4H4v16h12V4z" />
          <path d="M20 8v12H8" />
        </svg>
      `;
    } else if (view === "search") {
      item.innerHTML = `
        <svg class="activity-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      `;
    } else if (view === "settings") {
      item.innerHTML = `
        <svg class="activity-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width: 25px; height: 25px;">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      `;
    } else if (view === "keybindings") {
      item.innerHTML = `
        <svg class="activity-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width: 25px; height: 25px;">
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
          <line x1="6" y1="8" x2="6" y2="8" />
          <line x1="10" y1="8" x2="10" y2="8" />
          <line x1="14" y1="8" x2="14" y2="8" />
          <line x1="18" y1="8" x2="18" y2="8" />
          <line x1="6" y1="12" x2="6" y2="12" />
          <line x1="10" y1="12" x2="10" y2="12" />
          <line x1="14" y1="12" x2="14" y2="12" />
          <line x1="18" y1="12" x2="18" y2="12" />
          <line x1="7" y1="16" x2="17" y2="16" />
        </svg>
      `;
    }
  });

  const refreshBtn = document.querySelector("#editorRefreshExplorerButton");
  if (refreshBtn) {
    refreshBtn.innerHTML = `
      <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M4.681 3H2V2h3.5a.5.5 0 01.5.5V6H5V3.707L8.243 6.95a3.5 3.5 0 11-4.95 0L4 7.657a4.5 4.5 0 106.364 0L7.071 4.364 4.681 3z"/>
      </svg>
    `;
  }
  const newFileBtn = document.querySelector("#editorNewFileButton");
  if (newFileBtn) {
    newFileBtn.innerHTML = `
      <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
        <path d="M14 4.5V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6.5L14 4.5zm-1 .5H9V1.5L13 5zM3 2v12h10V6H8V2H3zM9 8v2H7v1h2v2h1v-2h2v-1h-2V8H9z"/>
      </svg>
    `;
  }
  const newFolderBtn = document.querySelector("#editorNewFolderButton");
  if (newFolderBtn) {
    newFolderBtn.innerHTML = `
      <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
        <path d="M14.5 3H9.7l-1.4-1.4c-.2-.2-.5-.3-.8-.3H1.5C.7 1.3 0 2 0 2.8v10.4c0 .8.7 1.5 1.5 1.5h13c.8 0 1.5-.7 1.5-1.5V4.5c0-.8-.7-1.5-1.5-1.5zM1 2.8c0-.3.2-.5.5-.5h6c.1 0 .2 0 .3.1l1.4 1.4c.1.1.2.2.3.2h5c.3 0 .5.2.5.5v1H1v-2.7zm14 10.4c0 .3-.2.5-.5.5h-13c-.3 0-.5-.2-.5-.5V6h14v7.2zM9.5 8H8v1.5H6.5v1H8V12h1.5v-1.5H11v-1H9.5V8z"/>
      </svg>
    `;
  }
  const closeAllBtn = document.querySelector("#editorCloseAllButton");
  if (closeAllBtn) {
    closeAllBtn.innerHTML = `
      <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M1 3.5a.5.5 0 01.5-.5h13a.5.5 0 010 1H1.5a.5.5 0 01-.5-.5zm2 4a.5.5 0 01.5-.5h9a.5.5 0 010 1h-9a.5.5 0 01-.5-.5zm3 4a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5z"/>
      </svg>
    `;
  }
  const moreBtn = document.querySelector("#editorMoreActionsButton");
  if (moreBtn) {
    moreBtn.innerHTML = `
      <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
      </svg>
    `;
  }

  const heroTitle = document.querySelector(".welcome-hero strong");
  if (heroTitle) heroTitle.textContent = "Visual Studio Code - SSH";
  const heroSubtitle = document.querySelector(".welcome-hero span");
  if (heroSubtitle) heroSubtitle.textContent = "Editing evolved";

  const startButtons = [
    ["#welcomeOpenFolderButton", "F", "Open Remote Folder..."],
    ["#welcomeOpenFilesButton", "O", "Show File Manager"],
    ["#welcomeCommandButton", "P", "Command Palette"],
  ];
  startButtons.forEach(([selector, icon, label]) => {
    const button = document.querySelector(selector);
    if (button) button.innerHTML = `<span class="welcome-action-icon">${icon}</span>${label}`;
  });

  document.querySelector(".welcome-walkthroughs")?.remove();
}

function joinRemotePath(basePath, name) {
  const base = basePath || state.currentPath || ".";
  if (base === "/") return `/${name}`;
  return `${base.replace(/\/$/, "")}/${name}`;
}

function getEditorFileIcon(name, isDir, expanded = false) {
  if (isDir) {
    return ""; // Folders in this UI do not have folder icons, only carets
  }
  
  const lowerName = name.toLowerCase();
  const ext = name.split(".").pop().toLowerCase();
  
  // Custom ESLint purple hexagon icon
  if (lowerName.includes("eslintrc")) {
    return `<svg viewBox="0 0 16 16" width="16" height="16" style="color: #8a4182; fill: currentColor; margin-right: 6px; flex-shrink: 0; vertical-align: middle;"><path d="M8 1L2 4.5v7L8 15l6-3.5v-7L8 1zm4.5 9.8L8 13.1l-4.5-2.3v-4.6L8 3.9l4.5 2.3v4.6z"/></svg>`;
  }
  
  // Git file teal/blue-green icon
  if (lowerName === ".gitignore" || lowerName.includes("git")) {
    return `<svg viewBox="0 0 16 16" width="16" height="16" style="color: #417e8a; fill: currentColor; margin-right: 6px; flex-shrink: 0; vertical-align: middle;"><path d="M15.6 7.4L8.6.4c-.5-.5-1.3-.5-1.8 0L.4 7.4c-.5.5-.5 1.3 0 1.8l7 7c.5.5 1.3.5 1.8 0l7-7c.5-.5.5-1.3 0-1.8zM9 11.5c0-.8-.7-1.5-1.5-1.5S6 10.7 6 11.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5zm0-5c0-.8-.7-1.5-1.5-1.5S6 5.7 6 6.5C6 7.3 6.7 8 7.5 8S9 7.3 9 6.5z"/></svg>`;
  }
  
  // Markdown blue icon
  if (ext === "md" || ext === "markdown") {
    if (lowerName === "readme.md") {
      // Info circle for README
      return `<svg viewBox="0 0 16 16" width="16" height="16" style="color: #519aba; fill: currentColor; margin-right: 6px; flex-shrink: 0; vertical-align: middle;"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM7.5 7.5h1v4h-1v-4zm0-2h1v1h-1v-1z"/></svg>`;
    }
    // Markdown M↓ bookmark
    return `<svg viewBox="0 0 16 16" width="16" height="16" style="color: #519aba; fill: currentColor; margin-right: 6px; flex-shrink: 0; vertical-align: middle;"><path d="M13 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM4 9h1.5v3H7V9h1.5V7H4v2zm5-2v3.5l1.5-1.5L12 10.5V7H9z"/></svg>`;
  }
  
  // TS file blue square icon
  if (ext === "ts" || name.endsWith(".d.ts")) {
    return `<span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; min-width: 16px; background-color: #3178c6; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 8px; font-weight: 800; border-radius: 2px; margin-right: 6px; vertical-align: middle; line-height: 1; user-select: none;">TS</span>`;
  }
  
  // JS file yellow square icon
  if (ext === "js" || ext === "mjs" || ext === "cjs") {
    return `<span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; min-width: 16px; background-color: #f1e05a; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 8px; font-weight: 800; border-radius: 2px; margin-right: 6px; vertical-align: middle; line-height: 1; user-select: none;">JS</span>`;
  }
  
  // JSON curly braces icon
  if (ext === "json") {
    let color = "#d1b06a"; // default yellow/amber curly braces
    if (lowerName === "package.json" || lowerName === "package-lock.json") {
      color = "#cbcb41"; // bright yellow for package JSONs
    } else if (lowerName === "components.json" || lowerName === "settings.local.json") {
      color = "#8ddb8c"; // green/yellow braces as in the screenshot
    }
    return `<svg viewBox="0 0 16 16" width="16" height="16" style="color: ${color}; fill: currentColor; margin-right: 6px; flex-shrink: 0; vertical-align: middle;"><path d="M5.02 2C4.46 2 4 2.45 4 3v2c0 1.1-.9 2-2 2h-.5v2H2c1.1 0 2 .9 2 2v2c0 .55.46 1 1.02 1H6v-1.5H5.5c-.28 0-.5-.22-.5-.5v-2.5c0-.83-.67-1.5-1.5-1.5.83 0 1.5-.67 1.5-1.5V4c0-.28.22-.5.5-.5H6V2H5.02zm5.96 0C11.54 2 12 2.45 12 3v2c0 1.1.9 2 2 2h.5v2H14c-1.1 0-2 .9-2 2v2c0 .55-.46 1-1.02 1H10v-1.5h.5c.28 0 .5-.22.5-.5v-2.5c0-.83.67-1.5 1.5-1.5-.83 0-1.5-.67-1.5-1.5V4c0-.28-.22-.5-.5-.5H10V2h.98z"/></svg>`;
  }
  
  // Settings/Env file gear icon
  if (lowerName.includes("env") || lowerName.includes("config") || ext === "env" || ext === "ini") {
    return `<svg viewBox="0 0 16 16" width="16" height="16" style="color: #417e8a; fill: currentColor; margin-right: 6px; flex-shrink: 0; vertical-align: middle;"><path d="M9.1 1.05a1.65 1.65 0 0 0-1.82 0l-.1.06a2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V2.5a2 2 0 0 1-2 2h-.09A1.65 1.65 0 0 0 .05 6.3a1.65 1.65 0 0 0 .33 1.82l.06.06c.78.78.78 2.05 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H2.5a2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1.02h.1a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51v-.09a2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1.02 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83l.06-.06c.78-.78.78-2.05 0-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H13.5a2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9.1 1.05zM8 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>`;
  }
  
  // Default file thin document icon
  return `<svg viewBox="0 0 16 16" width="16" height="16" style="color: #8b949e; fill: currentColor; margin-right: 6px; flex-shrink: 0; vertical-align: middle;"><path d="M9 1H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7L9 1zm4 12H3V3h5v5h5v5z"/></svg>`;
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
      { token: "", foreground: "c9d1d9" },
      { token: "comment", foreground: "7d8590", fontStyle: "italic" },
      { token: "punctuation.definition.comment", foreground: "7d8590", fontStyle: "italic" },
      { token: "string", foreground: "a8e6a1" },
      { token: "string.quoted", foreground: "a8e6a1" },
      { token: "constant.character.escape", foreground: "6cb6ff" },
      { token: "constant.numeric", foreground: "b4d8fd" },
      { token: "number", foreground: "b4d8fd" },
      { token: "constant.language", foreground: "6cb6ff" },
      { token: "keyword", foreground: "f47067" },
      { token: "keyword.control", foreground: "f47067" },
      { token: "keyword.operator.new", foreground: "f47067" },
      { token: "keyword.operator", foreground: "f47067" },
      { token: "delimiter", foreground: "b1bac4" },
      { token: "storage", foreground: "f47067" },
      { token: "storage.type", foreground: "f47067" },
      { token: "storage.modifier", foreground: "f47067" },
      { token: "entity.name.function", foreground: "dcbdfb" },
      { token: "support.function", foreground: "dcbdfb" },
      { token: "function", foreground: "dcbdfb" },
      { token: "entity.name.type", foreground: "f69d50" },
      { token: "entity.name.class", foreground: "f69d50" },
      { token: "support.class", foreground: "f69d50" },
      { token: "type", foreground: "f69d50" },
      { token: "class", foreground: "f69d50" },
      { token: "entity.name.type.interface", foreground: "f69d50" },
      { token: "support.type", foreground: "6cb6ff" },
      { token: "variable", foreground: "e6edf3" },
      { token: "variable.other", foreground: "e6edf3" },
      { token: "variable.parameter", foreground: "e6edf3" },
      { token: "variable.other.property", foreground: "e6edf3" },
      { token: "variable.other.object.property", foreground: "e6edf3" },
      { token: "entity.name.tag", foreground: "8ddb8c" },
      { token: "punctuation.definition.tag", foreground: "8ddb8c" },
      { token: "tag", foreground: "8ddb8c" },
      { token: "entity.other.attribute-name", foreground: "6cb6ff" },
      { token: "attribute.name", foreground: "6cb6ff" },
      { token: "meta.decorator", foreground: "dcbdfb" },
      { token: "punctuation.decorator", foreground: "dcbdfb" },
      { token: "entity.name.function.decorator", foreground: "dcbdfb" },
      { token: "punctuation", foreground: "b1bac4" },
      { token: "meta.property-name", foreground: "6cb6ff" },
      { token: "support.type.property-name", foreground: "6cb6ff" },
      { token: "support.constant.property-value", foreground: "b4d8fd" },
      { token: "meta.property-value", foreground: "b4d8fd" },
      { token: "entity.other.attribute-name.class", foreground: "8ddb8c" },
      { token: "entity.other.attribute-name.id", foreground: "8ddb8c" },
      { token: "keyword.other.unit", foreground: "b4d8fd" },
      { token: "string.regexp", foreground: "6cb6ff" },
      { token: "regexp", foreground: "6cb6ff" },
      { token: "support.type.property-name.json", foreground: "6cb6ff" },
      { token: "variable.language.this", foreground: "f47067", fontStyle: "italic" },
      { token: "entity.name.type.module", foreground: "f69d50" },
      { token: "entity.name.namespace", foreground: "f69d50" },
      { token: "keyword.control.import", foreground: "f47067" },
      { token: "keyword.control.export", foreground: "f47067" },
      { token: "keyword.control.from", foreground: "f47067" },
      { token: "string.template", foreground: "a8e6a1" },
      { token: "punctuation.definition.template-expression", foreground: "a8e6a1" },
      { token: "meta.template.expression", foreground: "e6edf3" }
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
      "editorBracketMatch.background": "#1f3a5f40",
      "editorBracketMatch.border": "#58a6ff80"
    }
  });
  defineM2ThemeDone = true;
}

export function ensureEditor() {
  if (state.editor || !window.monaco) return state.editor;
  applyVSCodeWorkbenchLabels();
  defineM2MonacoTheme();
  const editorHost = document.querySelector("#monacoEditor");
  state.editor = monaco.editor.create(editorHost, {
    value: "",
    language: "plaintext",
    theme: state.editorTheme,
    automaticLayout: true,
    minimap: { enabled: state.isEditorMinimapEnabled },
    fontSize: state.editorFontSize,
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
  updateEditorThemeClass();
  updateEditorWelcome();
  updateEditorToolbarState();
  updateEditorStatusBar();
  syncEditorSettingsControls();
  renderEditorTabs();
  return state.editor;
}

export function setEditorWorkbenchView(view = "explorer") {
  const normalizedView = ["explorer", "search", "settings", "keybindings"].includes(view) ? view : "explorer";
  const workbench = editorWorkbenchEl();
  if (workbench) workbench.dataset.editorView = normalizedView;

  document.querySelectorAll("[data-editor-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.editorView === normalizedView);
  });
  document.querySelectorAll("[data-editor-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.editorPanel === normalizedView);
  });

  editorSettingsWorkbenchEl()?.classList.toggle("hidden", normalizedView !== "settings");
  editorKeybindingsWorkbenchEl()?.classList.toggle("hidden", normalizedView !== "keybindings");
  const showingWorkbenchEditor = normalizedView === "settings" || normalizedView === "keybindings";
  editorWelcomeEl()?.classList.toggle("hidden", showingWorkbenchEditor || state.openFilePath !== "");
  document.querySelector("#monacoEditor")?.classList.toggle("hidden", showingWorkbenchEditor || state.openFilePath === "");

  if (normalizedView === "settings") syncEditorSettingsControls();
  if (!showingWorkbenchEditor) setTimeout(() => state.editor?.layout(), 40);
}

export function syncEditorSettingsControls() {
  const fontSize = editorFontSizeSettingEl();
  if (fontSize) fontSize.value = String(state.editorFontSize || 13);
  const minimap = editorMinimapSettingEl();
  if (minimap) minimap.checked = Boolean(state.isEditorMinimapEnabled);
  const theme = editorThemeSettingEl();
  if (theme) theme.value = state.editorTheme;
}

export function applyEditorFontSize(value) {
  const nextValue = Math.max(10, Math.min(24, Number(value) || 13));
  state.editorFontSize = nextValue;
  localStorage.setItem("sshBridgeEditorFontSize", String(nextValue));
  state.editor?.updateOptions({ fontSize: nextValue });
  syncEditorSettingsControls();
}

export function renderEditorTabs() {
  const tabs = editorTabsEl();
  if (!tabs) return;
  tabs.innerHTML = "";
  const openList = editorOpenListEl();
  if (openList) openList.innerHTML = "";

  if (state.openFiles.size === 0) {
    const welcomeTab = document.createElement("button");
    welcomeTab.type = "button";
    welcomeTab.className = "editor-tab active welcome-tab";
    welcomeTab.innerHTML = `
      <span class="tab-name">Welcome</span>
      <span class="tab-close">x</span>
    `;
    welcomeTab.addEventListener("click", () => setEditorWorkbenchView("explorer"));
    tabs.append(welcomeTab);
  }
  
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
    close.textContent = "x";
    
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
        <span class="explorer-file-icon">${getEditorFileIcon(filePath, false)}</span>
        <span class="explorer-file-name" title="${filePath}">${escapeHtml(filePath.split("/").pop())}</span>
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
  if (editorWorkbenchEl()?.dataset.editorView === "settings" || editorWorkbenchEl()?.dataset.editorView === "keybindings") {
    setEditorWorkbenchView("explorer");
  }
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
  const showingWorkbenchEditor = editorWorkbenchEl()?.dataset.editorView === "settings" || editorWorkbenchEl()?.dataset.editorView === "keybindings";
  editorWelcomeEl()?.classList.toggle("hidden", hasOpenFile || showingWorkbenchEditor);
  const editorHost = document.querySelector("#monacoEditor");
  if (editorHost) editorHost.classList.toggle("hidden", !hasOpenFile || showingWorkbenchEditor);
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
    const activityWidth = workbench.querySelector(".editor-activity-bar")?.getBoundingClientRect().width || 0;
    const width = Math.min(maxWidth, Math.max(minWidth, clientX - rect.left - activityWidth));
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
      ${isDir ? "" : `<span class="editor-tree-icon">${getEditorFileIcon(item.name, isDir, expanded)}</span>`}
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

export function updateEditorThemeClass() {
  const wEl = document.querySelector("#editorWindow");
  if (!wEl) return;
  wEl.classList.toggle("editor-theme-m2", state.editorTheme === "m2-dark");
}

export function toggleEditorTheme() {
  const idx = editorThemes.indexOf(state.editorTheme);
  const nextIdx = (idx + 1) % editorThemes.length;
  state.editorTheme = editorThemes[nextIdx];
  localStorage.setItem("sshBridgeEditorTheme", state.editorTheme);
  monaco?.editor?.setTheme(state.editorTheme);
  syncEditorSettingsControls();
  updateEditorThemeClass();
  showToast(`Editor theme changed to ${state.editorTheme}`, "info");
}

export function toggleEditorMinimap() {
  state.isEditorMinimapEnabled = !state.isEditorMinimapEnabled;
  localStorage.setItem("sshBridgeEditorMinimap", state.isEditorMinimapEnabled);
  state.editor?.updateOptions({ minimap: { enabled: state.isEditorMinimapEnabled } });
  syncEditorSettingsControls();
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
        <span class="command-icon">${getEditorFileIcon(item.name, false)}</span>
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
      { id: "save", name: "File: Save Current", desc: "Write editor contents over SFTP", icon: "S", action: () => saveCurrentFile() },
      { id: "close", name: "File: Close Tab", desc: "Close the currently focused file", icon: "X", action: () => closeEditorTab(state.openFilePath) },
      { id: "closeAll", name: "File: Close All Tabs", desc: "Close all active editor files", icon: "A", action: () => document.querySelector("#editorCloseAllButton")?.click() },
      { id: "theme", name: "Preferences: Toggle Theme", desc: "Toggle VS Light, VS Dark, and M2 Theme", icon: "T", action: () => toggleEditorTheme() },
      { id: "minimap", name: "Preferences: Toggle Minimap", desc: "Show or hide the side scroll bar minimap", icon: "M", action: () => toggleEditorMinimap() },
      { id: "settings", name: "Preferences: Open Settings", desc: "Open the VS Code style settings editor", icon: "G", action: () => setEditorWorkbenchView("settings") },
      { id: "keybindings", name: "Preferences: Open Keyboard Shortcuts", desc: "Open the keybindings editor", icon: "K", action: () => setEditorWorkbenchView("keybindings") },
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
