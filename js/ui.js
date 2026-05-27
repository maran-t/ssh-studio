import { state } from './state.js';

// DOM Getters to ensure elements are resolved properly
const toastContainer = () => document.querySelector("#toastContainer");
const connectMessage = () => document.querySelector("#connectMessage");
const fileRows = () => document.querySelector("#fileRows");
const windows = () => document.querySelectorAll(".window");
const taskApps = () => document.querySelectorAll(".task-app");

// Static Layout keys
const savedLayoutKey = "sshBridgeLayout";

export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function showToast(message, type = "info", title = "") {
  const container = toastContainer();
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
  setTimeout(dismiss, 4500);

  container.appendChild(toast);

  // Dispatch custom event for Notification Center integration
  document.dispatchEvent(new CustomEvent("systemNotification", {
    detail: { message, type, title: finalTitle, timestamp: Date.now() }
  }));
}

export function showModal({ title, message, type = "alert", defaultValue = "" }) {
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

// Wire up global shortcuts to window
window.osAlert = (message, title = "System message") => {
  showToast(message, "info", title);
};

window.osConfirm = (message, title = "Confirm Action") => {
  return showModal({ title, message, type: "confirm" });
};

window.osPrompt = (message, defaultValue = "", title = "Prompt Input") => {
  return showModal({ title, message, type: "prompt", defaultValue });
};

export function renderSkeleton() {
  const rows = fileRows();
  if (!rows) return;
  rows.innerHTML = "";
  for (let i = 0; i < 6; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton-row";
    skeleton.innerHTML = `
      <div class="skeleton-cell icon"></div>
      <div class="skeleton-cell name"></div>
      <div class="skeleton-cell meta"></div>
      <div class="skeleton-cell meta"></div>
    `;
    rows.appendChild(skeleton);
  }
}

export function setMessage(text, tone = "") {
  const msg = connectMessage();
  if (!msg) return;
  msg.textContent = text;
  msg.dataset.tone = tone;
}

export function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function persistWindowLayout() {
  const layout = {};
  windows().forEach((windowEl) => {
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

// Dynamic window configuration
export const appLaunchMeta = {
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
    iconText: "Link",
    previewClass: "settings",
  },
};

export function applySavedLayout() {
  const raw = localStorage.getItem(savedLayoutKey);
  if (!raw) return;
  try {
    const layout = JSON.parse(raw);
    windows().forEach((windowEl) => {
      const saved = layout[windowEl.id];
      if (!saved) return;
      windowEl.className = saved.className || windowEl.className;
      ["left", "top", "right", "bottom", "width", "height"].forEach((prop) => {
        windowEl.style[prop] = saved[prop] || "";
      });
      if (
        appLaunchMeta[windowEl.id] &&
        !windowEl.classList.contains("closed") &&
        !windowEl.classList.contains("minimized")
      ) {
        state.launchedWindowIds.add(windowEl.id);
      }
    });
    taskApps().forEach((button) => {
      const relatedWindow = document.querySelector(`#${button.dataset.window}`);
      const isClosed = relatedWindow?.classList.contains("closed");
      const isMinimized = relatedWindow?.classList.contains("minimized");
      const isActive = relatedWindow?.classList.contains("focused") && !isClosed && !isMinimized;
      button.classList.toggle("minimized", isMinimized);
      button.classList.toggle("closed", isClosed);
      button.classList.toggle("active", isActive);
      button.classList.toggle("open", Boolean(relatedWindow && !isClosed && !isMinimized && !isActive));
    });
  } catch (e) {
    console.log("Layout parse failed", e);
  }
}

export function applyAnimationSetting() {
  document.documentElement.classList.toggle("animations-disabled", !state.isAnimationEnabled);
  const toggle = document.querySelector("#animationToggle");
  if (toggle) toggle.checked = state.isAnimationEnabled;
}

export function setAnimationEnabled(enabled) {
  state.isAnimationEnabled = Boolean(enabled);
  localStorage.setItem("sshBridgeAnimations", String(state.isAnimationEnabled));
  applyAnimationSetting();
}
