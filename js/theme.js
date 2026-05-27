// SSH OS Bridge — theme bootstrap and inline icon renderer.
//
// Why inline icons (not a CDN):
//   * Electron + corporate networks frequently block unpkg/jsdelivr.
//   * Cold-load latency from a CDN flickers icons in for a moment after
//     the page paints — looks unprofessional.
//   * The set of icons we need is small enough to inline.
//
// We accept the same authoring convention Lucide uses — `<i data-lucide="name">` —
// then swap each occurrence for an inline <svg> taken from our ICONS map below.
// If Lucide happens to be present (e.g. someone adds it later), we'll let it
// process any name we don't have. The icons are styled by CSS via `currentColor`
// strokes, so they pick up the surrounding text color automatically.
//
// Responsibilities:
//   1. Pick the active theme (dark | light) from localStorage, falling
//      back to the OS preference. Reflect it as data-theme on <html>.
//   2. Render a floating theme-toggle pill.
//   3. Map legacy text/emoji icons to <i data-lucide> placeholders.
//   4. Convert <i data-lucide> placeholders to inline SVG.
//   5. Re-run conversion when the DOM mutates (new file rows, transfers, etc.).
(function () {
  "use strict";

  const THEME_STORAGE_KEY = "ssh-os-bridge.theme";
  const root = document.documentElement;

  // ============================== Icon library ==============================
  // Each entry is the inner markup of an <svg viewBox="0 0 24 24"> element.
  // Stroke-based icons inherit color via `stroke="currentColor"` set on the
  // wrapper <svg>. Path data is sourced from the Lucide icon set (ISC license).
  const SVG_ATTRS =
    'xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';

  const ICONS = {
    // ---- File / folder ----
    folder:
      '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    "folder-plus":
      '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M12 10v6"/><path d="M9 13h6"/>',
    file:
      '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    "file-plus":
      '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 15h6"/><path d="M12 18v-6"/>',
    "file-text":
      '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h2"/>',
    "file-code":
      '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>',
    "file-code-2":
      '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>',
    "file-check":
      '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/>',
    files:
      '<path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"/><path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8"/><path d="M15 2v5h5"/>',
    braces:
      '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>',
    sheet:
      '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>',
    music:
      '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    film:
      '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>',
    image:
      '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    archive:
      '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',

    // ---- Nav / chrome ----
    search:
      '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    settings:
      '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    keyboard:
      '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/>',
    terminal:
      '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
    command:
      '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>',
    "layout-grid":
      '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    "panel-right":
      '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>',

    // ---- Actions ----
    "arrow-left":
      '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    "arrow-right":
      '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "arrow-up-from-line":
      '<path d="m18 9-6-6-6 6"/><path d="M12 3v14"/><path d="M5 21h14"/>',
    "arrow-down-up":
      '<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>',
    "refresh-cw":
      '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    "external-link":
      '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    pencil:
      '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    "pen-line":
      '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
    "trash-2":
      '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    upload:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    download:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    save:
      '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    replace:
      '<path d="M14 4c0-1.1.9-2 2-2"/><path d="M20 2c1.1 0 2 .9 2 2"/><path d="M22 8c0 1.1-.9 2-2 2"/><path d="M16 10c-1.1 0-2-.9-2-2"/><path d="m3 7 3 3 3-3"/><path d="M6 10V5c0-1.7 1.3-3 3-3h1"/><rect width="8" height="8" x="2" y="14" rx="2"/>',
    palette:
      '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    map:
      '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',

    // ---- Window controls ----
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    "x-square":
      '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    minus: '<path d="M5 12h14"/>',
    maximize:
      '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    "maximize-2":
      '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>',
    "chevrons-down-up":
      '<path d="m7 20 5-5 5 5"/><path d="m7 4 5 5 5-5"/>',
    "more-horizontal":
      '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    "list-x":
      '<path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="m19 10-4 4"/><path d="m15 10 4 4"/>',
    "log-out":
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',

    // ---- Status / tray ----
    eye:
      '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    wifi:
      '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
    "volume-2":
      '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
    "battery-medium":
      '<rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/><line x1="6" x2="6" y1="11" y2="13"/><line x1="10" x2="10" y1="11" y2="13"/>',
    bell:
      '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    sun:
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    monitor:
      '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    "shield-check":
      '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    "clipboard-copy":
      '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/>',
  };

  // ============================== Renderer ==============================
  function renderIcon(el) {
    if (!el || el.dataset.iconRendered === "1") return;
    const name = el.getAttribute("data-lucide");
    const body = ICONS[name];
    if (!body) {
      // Fall back to upstream Lucide if available.
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        try { window.lucide.createIcons({ attrs: { class: "ssh-lucide" } }); }
        catch (err) { /* ignore */ }
      }
      return;
    }
    const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    wrapper.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    wrapper.setAttribute("viewBox", "0 0 24 24");
    wrapper.setAttribute("fill", "none");
    wrapper.setAttribute("stroke", "currentColor");
    wrapper.setAttribute("stroke-width", "1.75");
    wrapper.setAttribute("stroke-linecap", "round");
    wrapper.setAttribute("stroke-linejoin", "round");
    wrapper.setAttribute("aria-hidden", "true");
    // Copy classes so size modifiers (.ico-md etc.) keep working.
    if (el.className) wrapper.setAttribute("class", el.className + " ssh-lucide lucide-" + name);
    else wrapper.setAttribute("class", "ssh-lucide lucide-" + name);
    wrapper.innerHTML = body;
    el.replaceWith(wrapper);
    wrapper.dataset.iconRendered = "1";
  }

  function renderAll() {
    const targets = document.querySelectorAll('i[data-lucide]:not([data-icon-rendered="1"])');
    targets.forEach(renderIcon);
  }

  // ============================== Theme ==============================
  function preferredTheme() {
    const stored = (() => {
      try { return localStorage.getItem(THEME_STORAGE_KEY); }
      catch { return null; }
    })();
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); }
    catch { /* storage unavailable */ }
    const pill = document.getElementById("themeTogglePill");
    if (pill) {
      // Replace the icon: swap to sun if dark (so the button says "switch to light"),
      // and moon if light.
      const oldSvg = pill.querySelector("svg.ssh-lucide");
      const target = theme === "dark" ? "sun" : "moon";
      if (oldSvg) oldSvg.remove();
      const i = document.createElement("i");
      i.setAttribute("data-lucide", target);
      i.className = "ico ico-sm";
      pill.prepend(i);
      renderIcon(i);
      const label = pill.querySelector(".theme-toggle-label");
      if (label) label.textContent = theme === "dark" ? "Light" : "Dark";
    }
  }

  function toggleTheme() {
    applyTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light");
  }

  // ============================== Markup mapping ==============================
  // Map known elements in the legacy markup to <i data-lucide> placeholders.
  // After this pass we call renderAll() to swap them for inline SVGs.
  const REPLACEMENTS = [
    // Editor activity bar
    { sel: '.editor-activity-item[data-editor-view="explorer"]', name: "files" },
    { sel: '.editor-activity-item[data-editor-view="search"]', name: "search" },
    { sel: '.editor-activity-item[data-editor-view="settings"]', name: "settings" },
    { sel: '.editor-activity-item[data-editor-view="keybindings"]', name: "keyboard" },

    // File manager toolbar
    { sel: "#backButton", name: "arrow-left" },
    { sel: "#forwardButton", name: "arrow-right" },
    { sel: "#refreshButton", name: "refresh-cw", keep: true },
    { sel: "#newFileButton", name: "file-plus", keep: true },
    { sel: "#newFolderButton", name: "folder-plus", keep: true },
    { sel: "#openFileButton", name: "external-link", keep: true },
    { sel: "#renameButton", name: "pencil", keep: true },
    { sel: "#deleteButton", name: "trash-2", keep: true },
    { sel: "#uploadButton", name: "upload", keep: true },
    { sel: "#copySelectedButton", name: "download", keep: true },
    { sel: "#togglePreviewPaneBtn", name: "panel-right", keep: true, replaceEmoji: /[\u{1F441}\u{FE0F}]/u },
    { sel: "#toggleHiddenBtn", name: "eye", keep: true, replaceEmoji: /[\u{1F441}\u{FE0F}]/u },
    { sel: "#viewToggleBtn", name: "layout-grid", keep: true },

    // Editor explorer micro-icons
    { sel: "#editorNewFileButton", name: "file-plus" },
    { sel: "#editorNewFolderButton", name: "folder-plus" },
    { sel: "#editorRefreshExplorerButton", name: "refresh-cw" },
    { sel: "#editorCloseAllButton", name: "chevrons-down-up" },
    { sel: "#editorMoreActionsButton", name: "more-horizontal" },

    // Workspace bar
    { sel: "#fullscreenButton", name: "maximize" },
    { sel: "#disconnectButton", name: "log-out", keep: true },

    // Connect form
    { sel: ".dialog-close", name: "x" },
    { sel: ".ssh-lock-icon", name: "shield-check", swapSvg: true },
    { sel: "#toggleKeyTextarea", name: "pen-line" },

    // Tray icons
    { sel: "#trayWifi", name: "wifi", swapSvg: true, wrap: true },
    { sel: "#trayVolume", name: "volume-2", swapSvg: true, wrap: true },
    { sel: "#trayBattery", name: "battery-medium", swapSvg: true, wrap: true },
    { sel: "#trayNotification", name: "bell", swapSvg: true, wrap: true, keepChildren: ["#trayBadge"] },

    // Taskbar
    { sel: ".taskbar-search", name: "search", swapSvg: true, wrap: true, keepChildren: ["span"] },
    { sel: ".start-button", name: "layout-grid", swapSvg: true, wrap: true },
    { sel: '.task-app[data-window="filesWindow"]', name: "folder", swapSvg: true, wrap: true, keepChildren: ["span"] },
    { sel: '.task-app[data-window="editorWindow"]', name: "file-code", swapSvg: true, wrap: true, keepChildren: ["span"] },
    { sel: '.task-app[data-window="terminalWindow"]', name: "terminal", swapSvg: true, wrap: true, keepChildren: ["span"] },
    { sel: '.task-app[data-window="transferWindow"]', name: "arrow-down-up", swapSvg: true, wrap: true, keepChildren: ["span"] },
    { sel: '.task-app[data-window="settingsWindow"]', name: "settings", swapSvg: true, wrap: true, keepChildren: ["span"] },

    // Start menu launcher tiles
    { sel: '.launcher-app[data-launch-window="filesWindow"] .launcher-icon', name: "folder" },
    { sel: '.launcher-app[data-launch-window="terminalWindow"] .launcher-icon', name: "terminal" },
    { sel: '.launcher-app[data-launch-window="editorWindow"] .launcher-icon', name: "file-code" },
    { sel: '.launcher-app[data-launch-window="transferWindow"] .launcher-icon', name: "arrow-down-up" },

    // Context menu items
    { sel: "#contextBringFront", name: "arrow-up-from-line", keep: true },
    { sel: "#contextMinimize", name: "minus", keep: true },
    { sel: "#contextMaximize", name: "maximize-2", keep: true },
    { sel: "#contextClose", name: "x", keep: true },
    { sel: "#fileContextOpen", name: "external-link", keep: true },
    { sel: "#fileContextRename", name: "pencil", keep: true },
    { sel: "#fileContextDownload", name: "download", keep: true },
    { sel: "#fileContextCopyPath", name: "clipboard-copy", keep: true },
    { sel: "#fileContextDelete", name: "trash-2", keep: true },
    { sel: "#tabContextClose", name: "x", keep: true },
    { sel: "#tabContextCloseOthers", name: "list-x", keep: true },
    { sel: "#tabContextCloseSaved", name: "file-check", keep: true },
    { sel: "#tabContextCloseAll", name: "x-square", keep: true },
    { sel: "#contextChangeBg", name: "image", keep: true },
    { sel: "#contextShowDesktop", name: "monitor", keep: true },

    // Editor side actions
    { sel: "#commandPaletteButton", name: "command", keep: true },
    { sel: "#findReplaceButton", name: "replace", keep: true },
    { sel: "#themeToggleButton", name: "palette", keep: true },
    { sel: "#minimapToggleButton", name: "map", keep: true },
    { sel: "#saveFileButton", name: "save", keep: true },
  ];

  function placeIcon(el, name, opts) {
    if (!el || el.hasAttribute("data-lucide-replaced")) return;

    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", name);
    icon.classList.add("ico");

    if (opts.swapSvg) {
      // Detach (don't clone) any children we want to keep, then wipe contents
      // and re-insert. This avoids the duplicate-text bug.
      const keepNodes = opts.keepChildren
        ? Array.from(el.querySelectorAll(opts.keepChildren.join(",")))
        : [];
      keepNodes.forEach((n) => n.remove());
      el.replaceChildren();
      el.appendChild(icon);
      keepNodes.forEach((k) => el.appendChild(k));
    } else if (opts.keep) {
      if (opts.replaceEmoji) {
        el.childNodes.forEach((n) => {
          if (n.nodeType === 3) n.textContent = n.textContent.replace(opts.replaceEmoji, "").trim();
        });
      }
      el.prepend(icon);
    } else {
      el.replaceChildren(icon);
    }
    el.setAttribute("data-lucide-replaced", "true");
  }

  function applyReplacements() {
    REPLACEMENTS.forEach((rule) => {
      document.querySelectorAll(rule.sel).forEach((el) => {
        placeIcon(el, rule.name, rule);
      });
    });
    renderAll();
  }

  function buildThemeToggle() {
    if (document.getElementById("themeTogglePill")) return;
    const pill = document.createElement("button");
    pill.id = "themeTogglePill";
    pill.type = "button";
    pill.className = "theme-toggle-pill";
    pill.setAttribute("aria-label", "Toggle dark and light theme");
    const i = document.createElement("i");
    i.setAttribute("data-lucide", "sun");
    i.className = "ico ico-sm";
    const lbl = document.createElement("span");
    lbl.className = "theme-toggle-label";
    lbl.textContent = "Light";
    pill.append(i, lbl);
    pill.addEventListener("click", toggleTheme);
    document.body.appendChild(pill);
    renderIcon(i);
  }

  // ============================== Boot ==============================
  function boot() {
    applyTheme(preferredTheme());
    buildThemeToggle();
    applyReplacements();

    // Re-run on dynamic content (file rows, transfer items, etc.).
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        // First, render any raw <i data-lucide> that appeared.
        renderAll();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Expose for debugging and for fileManager.js to call after rendering rows.
  window.SshTheme = {
    apply: applyTheme,
    toggle: toggleTheme,
    refreshIcons: renderAll,
    renderIcon: renderIcon,
    ICONS: ICONS,
  };
})();
