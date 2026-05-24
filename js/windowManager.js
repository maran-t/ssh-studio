import { state } from './state.js';
import { appLaunchMeta, escapeHtml, persistWindowLayout } from './ui.js';
import { rememberRecentApp } from './startMenu.js';

// DOM Getters
const windows = () => document.querySelectorAll(".window");
const taskApps = () => document.querySelectorAll(".task-app");

export const preMaximizedBounds = new Map();

const taskStateLabels = {
  active: "Active",
  open: "Open",
  minimized: "Minimized",
  closed: "Closed",
};

export function syncTaskbarState() {
  taskApps().forEach((button) => {
    const relatedWindow = document.querySelector(`#${button.dataset.window}`);
    const meta = appLaunchMeta[button.dataset.window];
    if (!relatedWindow || !meta) return;

    const isClosed = relatedWindow.classList.contains("closed");
    const isMinimized = relatedWindow.classList.contains("minimized");
    const isActive = relatedWindow.classList.contains("focused") && !isClosed && !isMinimized;
    const taskState = isClosed ? "closed" : isMinimized ? "minimized" : isActive ? "active" : "open";

    button.classList.toggle("active", isActive);
    button.classList.toggle("open", taskState === "open");
    button.classList.toggle("minimized", isMinimized);
    button.classList.toggle("closed", isClosed);
    button.dataset.taskState = taskState;
    button.dataset.tooltip = `${meta.name} - ${taskStateLabels[taskState]}`;
    button.setAttribute("aria-label", `${meta.name}, ${taskStateLabels[taskState]}`);
    button.setAttribute("aria-pressed", String(isActive));
    button.removeAttribute("title");
  });
}

function getTaskTargetDelta(windowEl) {
  const taskButton = document.querySelector(`[data-window="${windowEl.id}"]`);
  const windowRect = windowEl.getBoundingClientRect();
  const taskRect = taskButton?.getBoundingClientRect();
  return {
    x: taskRect ? taskRect.left + taskRect.width / 2 - (windowRect.left + windowRect.width / 2) : 0,
    y: taskRect ? taskRect.top + taskRect.height / 2 - (windowRect.top + windowRect.height / 2) : 54,
    origin: taskRect
      ? `${Math.round(((taskRect.left + taskRect.width / 2 - windowRect.left) / windowRect.width) * 100)}% 100%`
      : "50% 100%",
  };
}

export function animateWindow(windowEl, type, options = {}) {
  if (!state.isAnimationEnabled || !windowEl) return Promise.resolve();
  window.gsap?.killTweensOf(windowEl);
  const dockDelta = getTaskTargetDelta(windowEl);
  const minimizeX = dockDelta.x;
  const minimizeY = dockDelta.y;

  const gsapAnimations = {
    open: {
      from: {
        autoAlpha: 0,
        x: minimizeX * 0.35,
        y: Math.min(48, Math.max(18, minimizeY * 0.22)),
        scaleX: 0.88,
        scaleY: 0.72,
        filter: "blur(10px)",
        transformOrigin: dockDelta.origin,
        clipPath: "inset(22% 18% 0% 18% round 18px)",
      },
      to: {
        autoAlpha: 1,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        filter: "blur(0px)",
        clipPath: "inset(0% 0% 0% 0% round 0px)",
        duration: 0.46,
        ease: "expo.out",
      },
    },
    focus: {
      from: { y: 0, scale: 0.996, filter: "brightness(1.035) saturate(1.04)" },
      to: { y: -1, scale: 1, filter: "brightness(1) saturate(1)", duration: 0.22, ease: "sine.out" },
    },
    minimize: {
      from: {
        autoAlpha: 1,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        filter: "blur(0px)",
        transformOrigin: dockDelta.origin,
        clipPath: "inset(0% 0% 0% 0% round 0px)",
      },
      to: {
        autoAlpha: 0,
        x: minimizeX,
        y: minimizeY,
        scaleX: 0.18,
        scaleY: 0.08,
        skewX: minimizeX < 0 ? 9 : -9,
        filter: "blur(8px)",
        clipPath: "inset(38% 22% 0% 22% round 18px)",
        duration: 0.42,
        ease: "power3.inOut",
      },
    },
    close: {
      from: { autoAlpha: 1, scale: 1, y: 0, filter: "blur(0px) brightness(1)", transformOrigin: "50% 52%" },
      to: { autoAlpha: 0, scale: 0.965, y: 10, filter: "blur(8px) brightness(1.08)", duration: 0.2, ease: "sine.in" },
    },
    maximize: {
      from: {
        x: options.flip?.x || 0,
        y: options.flip?.y || 0,
        scaleX: options.flip?.scaleX || 0.98,
        scaleY: options.flip?.scaleY || 0.98,
        filter: "blur(2px)",
        transformOrigin: "0 0",
      },
      to: { x: 0, y: 0, scaleX: 1, scaleY: 1, filter: "blur(0px)", duration: 0.36, ease: "expo.out" },
    },
  };

  const gsapConfig = gsapAnimations[type];
  if (window.gsap && gsapConfig) {
    return new Promise((resolve) => {
      window.gsap.fromTo(windowEl, gsapConfig.from, {
        ...gsapConfig.to,
        clearProps: "transform,filter,opacity,visibility,clipPath,clip-path,skewX",
        onComplete: resolve,
        onInterrupt: resolve,
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
        { opacity: 0, transform: `translate3d(${minimizeX * 0.35}px, 34px, 0) scale(0.84, 0.72)`, filter: "blur(10px)" },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1, 1)", filter: "blur(0)" },
      ],
      options: { ...common, duration: 460, easing: "cubic-bezier(0.19, 1, 0.22, 1)" },
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
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1, 1)", filter: "blur(0)" },
        { opacity: 0, transform: `translate3d(${minimizeX}px, ${minimizeY}px, 0) scale(0.18, 0.08)`, filter: "blur(8px)" },
      ],
      options: { ...common, duration: 420 },
    },
    close: {
      keyframes: [
        { opacity: 1, transform: "scale(1)", filter: "blur(0)" },
        { opacity: 0, transform: "translate3d(0, 10px, 0) scale(0.965)", filter: "blur(8px)" },
      ],
      options: { ...common, duration: 200, easing: "cubic-bezier(0.5, 0, 0.75, 0)" },
    },
    maximize: {
      keyframes: [
        { transform: `translate3d(${options.flip?.x || 0}px, ${options.flip?.y || 0}px, 0) scale(${options.flip?.scaleX || 0.98}, ${options.flip?.scaleY || 0.98})`, filter: "blur(2px)", transformOrigin: "0 0" },
        { transform: "translate3d(0, 0, 0) scale(1, 1)", filter: "blur(0)", transformOrigin: "0 0" },
      ],
      options: { ...common, duration: 360, easing: "cubic-bezier(0.19, 1, 0.22, 1)" },
    },
  };
  const config = fallbackAnimations[type];
  if (!config) return Promise.resolve();
  const animation = windowEl.animate(config.keyframes, config.options);
  return animation.finished.catch(() => {});
}

export function focusWindow(id) {
  const targetWindow = document.querySelector(`#${id}`);
  if (!targetWindow) return;
  if (appLaunchMeta[id]) state.launchedWindowIds.add(id);
  const wasHidden = targetWindow.classList.contains("minimized") || targetWindow.classList.contains("closed");
  const wasFocused = targetWindow.classList.contains("focused");

  document.querySelector("#taskbarContextMenu")?.classList.add("hidden");

  targetWindow.classList.remove("minimized", "closed");
  
  state.topZIndex++;
  targetWindow.style.zIndex = state.topZIndex;

  windows().forEach((windowEl) => {
    windowEl.classList.toggle("focused", windowEl.id === id);
  });
  syncTaskbarState();
  targetWindow.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (wasHidden || !wasFocused) animateWindow(targetWindow, wasHidden ? "open" : "focus");
  rememberRecentApp(id);
  if (id === "editorWindow" && state.editor) setTimeout(() => state.editor.layout(), 80);
}

export async function minimizeWindow(id) {
  const targetWindow = document.querySelector(`#${id}`);
  if (!targetWindow) return;

  await animateWindow(targetWindow, "minimize");
  targetWindow.classList.add("minimized");
  targetWindow.classList.remove("focused");
  syncTaskbarState();

  const visibleWindow = [...windows()].find((windowEl) => !windowEl.classList.contains("closed") && !windowEl.classList.contains("minimized"));
  if (visibleWindow) focusWindow(visibleWindow.id);
  else syncTaskbarState();
  persistWindowLayout();
}

export async function closeWindow(id) {
  const targetWindow = document.querySelector(`#${id}`);
  if (!targetWindow) return;
  if (id === "editorWindow" && [...state.openFiles.values()].some((file) => file.dirty)) {
    const confirmed = await window.osConfirm("Close editor and discard unsaved changes?", "Close Editor");
    if (!confirmed) return;
  }
  await animateWindow(targetWindow, "close");
  targetWindow.classList.add("closed");
  state.launchedWindowIds.delete(id);
  targetWindow.classList.remove("focused", "maximized");
  syncTaskbarState();
  const visibleWindow = [...windows()].find((windowEl) => !windowEl.classList.contains("closed") && !windowEl.classList.contains("minimized"));
  if (visibleWindow) focusWindow(visibleWindow.id);
  else syncTaskbarState();
  persistWindowLayout();
}

export function maximizeWindow(id) {
  const targetWindow = document.querySelector(`#${id}`);
  if (!targetWindow) return;
  targetWindow.classList.remove("minimized", "closed");
  const beforeRect = targetWindow.getBoundingClientRect();

  const isMaximized = targetWindow.classList.contains("maximized");
  if (!isMaximized) {
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
    targetWindow.classList.remove("maximized");
    const bounds = preMaximizedBounds.get(id);
    if (bounds) {
      targetWindow.style.left = bounds.left;
      targetWindow.style.top = bounds.top;
      targetWindow.style.width = bounds.width;
      targetWindow.style.height = bounds.height;
    }
  }

  state.topZIndex++;
  targetWindow.style.zIndex = state.topZIndex;
  windows().forEach((windowEl) => {
    windowEl.classList.toggle("focused", windowEl.id === id);
  });
  syncTaskbarState();
  rememberRecentApp(id);

  const afterRect = targetWindow.getBoundingClientRect();
  const flip = {
    x: beforeRect.left - afterRect.left,
    y: beforeRect.top - afterRect.top,
    scaleX: beforeRect.width / Math.max(afterRect.width, 1),
    scaleY: beforeRect.height / Math.max(afterRect.height, 1),
  };
  animateWindow(targetWindow, "maximize", { flip });
  if (id === "editorWindow" && state.editor) setTimeout(() => state.editor.layout(), 80);
  persistWindowLayout();
}

export function makeWindowsDraggable() {
  windows().forEach((windowEl) => {
    const titlebar = windowEl.querySelector(".window-titlebar");
    if (!titlebar) return;

    titlebar.addEventListener("dblclick", (event) => {
      if (event.target.closest("button")) return;
      maximizeWindow(windowEl.id);
    });

    titlebar.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      
      let isMax = windowEl.classList.contains("maximized");
      if (isMax) {
        windowEl.classList.remove("maximized");
        const bounds = preMaximizedBounds.get(windowEl.id);
        if (bounds) {
          windowEl.style.width = bounds.width;
          windowEl.style.height = bounds.height;
        } else {
          windowEl.style.width = "720px";
          windowEl.style.height = "520px";
        }
        
        const dragRect = windowEl.getBoundingClientRect();
        windowEl.style.left = `${event.clientX - dragRect.width / 2}px`;
        windowEl.style.top = `${event.clientY - 14}px`;
        isMax = false;
        focusWindow(windowEl.id);
      }

      focusWindow(windowEl.id);
      const shiftX = event.clientX - windowEl.getBoundingClientRect().left;
      const shiftY = event.clientY - windowEl.getBoundingClientRect().top;

      const onPointerMove = (e) => {
        windowEl.style.left = `${e.clientX - shiftX}px`;
        windowEl.style.top = `${e.clientY - shiftY}px`;
      };

      const onPointerUp = () => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        persistWindowLayout();
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    });
  });
}

export function makeWindowsResizable() {
  windows().forEach((windowEl) => {
    let resizer = windowEl.querySelector(".window-resizer, .resize-handle.br");
    if (!resizer) {
      resizer = document.createElement("span");
      resizer.className = "resize-handle br window-resizer";
      resizer.setAttribute("aria-hidden", "true");
      windowEl.append(resizer);
    }

    resizer.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      focusWindow(windowEl.id);
      windowEl.classList.remove("maximized");

      const startWidth = windowEl.getBoundingClientRect().width;
      const startHeight = windowEl.getBoundingClientRect().height;
      const startX = event.clientX;
      const startY = event.clientY;

      const onPointerMove = (e) => {
        const width = startWidth + (e.clientX - startX);
        const height = startHeight + (e.clientY - startY);
        windowEl.style.width = `${Math.max(340, width)}px`;
        windowEl.style.height = `${Math.max(220, height)}px`;
        if (windowEl.id === "editorWindow" && state.editor) state.editor.layout();
      };

      const onPointerUp = () => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        persistWindowLayout();
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    });
  });
}

// Alt+Tab Application Switcher functions
export function getAltTabWindows() {
  return [...windows()]
    .filter((windowEl) => (
      appLaunchMeta[windowEl.id] &&
      state.launchedWindowIds.has(windowEl.id) &&
      !windowEl.classList.contains("closed")
    ))
    .sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0));
}

export function renderAltTabItems() {
  const altTabList = document.querySelector("#altTabList");
  if (!altTabList) return;
  altTabList.innerHTML = "";

  state.altTabItems.forEach((windowEl, index) => {
    const meta = appLaunchMeta[windowEl.id];
    const button = document.createElement("button");
    button.className = "alt-tab-item";
    button.type = "button";
    button.dataset.altTabIndex = String(index);
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === state.altTabIndex));
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

export function animateAltTabOpen() {
  if (!state.isAnimationEnabled || !window.gsap) return;
  const overlay = document.querySelector("#altTabOverlay");
  const switcher = overlay?.querySelector(".alt-tab-switcher");
  const altTabList = document.querySelector("#altTabList");
  if (!overlay || !switcher) return;
  
  window.gsap.killTweensOf([overlay, switcher, ".alt-tab-item"]);
  window.gsap.fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: "power2.out" });
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

export function animateAltTabSelection() {
  const altTabList = document.querySelector("#altTabList");
  if (!state.isAnimationEnabled || !window.gsap || !altTabList) return;
  const active = altTabList.querySelector(".alt-tab-item.active");
  if (!active) return;
  window.gsap.killTweensOf(active);
  window.gsap.fromTo(active, { scale: 0.97, y: 2 }, { scale: 1, y: 0, duration: 0.18, ease: "back.out(1.8)" });
}

export function updateAltTabSelection() {
  const altTabList = document.querySelector("#altTabList");
  if (!altTabList) return;
  windows().forEach((windowEl) => {
    windowEl.classList.toggle("alt-tab-target", windowEl === state.altTabItems[state.altTabIndex]);
  });
  altTabList.querySelectorAll(".alt-tab-item").forEach((item, index) => {
    const active = index === state.altTabIndex;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", String(active));
    if (active) item.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  animateAltTabSelection();
}

export function openAltTabSwitcher(direction = 1) {
  const overlay = document.querySelector("#altTabOverlay");
  const altTabList = document.querySelector("#altTabList");
  if (!overlay || !altTabList) return;
  state.altTabItems = getAltTabWindows();
  if (!state.altTabItems.length) return;

  const focusedIndex = state.altTabItems.findIndex((windowEl) => windowEl.classList.contains("focused"));
  if (!state.isAltTabOpen) {
    state.isAltTabOpen = true;
    state.altTabIndex = focusedIndex >= 0 ? focusedIndex : 0;
    overlay.classList.remove("hidden");
    overlay.style.opacity = "";
    overlay.style.visibility = "";
    overlay.setAttribute("aria-hidden", "false");
    renderAltTabItems();
    animateAltTabOpen();
  }

  state.altTabIndex = (state.altTabIndex + direction + state.altTabItems.length) % state.altTabItems.length;
  updateAltTabSelection();
}

export function closeAltTabSwitcher(shouldFocus = true) {
  const overlay = document.querySelector("#altTabOverlay");
  if (!state.isAltTabOpen || !overlay) return;
  const selectedWindow = state.altTabItems[state.altTabIndex];

  const finish = () => {
    overlay.style.opacity = "";
    overlay.style.visibility = "";
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    windows().forEach((windowEl) => windowEl.classList.remove("alt-tab-target"));
    state.isAltTabOpen = false;
    state.altTabItems = [];
    state.altTabIndex = 0;
    if (shouldFocus && selectedWindow) focusWindow(selectedWindow.id);
  };

  if (state.isAnimationEnabled && window.gsap) {
    const switcher = overlay.querySelector(".alt-tab-switcher");
    window.gsap.to(switcher, { y: 10, scale: 0.97, filter: "blur(5px)", duration: 0.12, ease: "power2.in" });
    window.gsap.to(overlay, { autoAlpha: 0, duration: 0.14, ease: "power2.in", onComplete: finish });
    return;
  }

  finish();
}
