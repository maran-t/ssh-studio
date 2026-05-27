import { state } from './state.js';
import { appLaunchMeta, escapeHtml } from './ui.js';

// DOM Selectors
const startMenuPanelEl = () => document.querySelector("#startMenuPanel");
const desktopRecentAppsEl = () => document.querySelector("#desktopRecentApps");
const connectPanelEl = () => document.querySelector("#connectPanel");

const savedRecentAppsKey = "sshBridgeRecentApps";

export function loadRecentApps() {
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

export function saveRecentApps(apps) {
  localStorage.setItem(savedRecentAppsKey, JSON.stringify(apps.slice(0, 5)));
}

export function formatRecentAppTime(timestamp) {
  const date = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function renderRecentApps() {
  const container = desktopRecentAppsEl();
  if (!container) return;
  const recentApps = loadRecentApps();
  container.innerHTML = "";

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
    container.append(button);
  });
}

export function rememberRecentApp(id) {
  if (!appLaunchMeta[id]) return;
  const recentApps = loadRecentApps().filter((app) => app.id !== id);
  recentApps.unshift({ id, usedAt: Date.now() });
  saveRecentApps(recentApps);
  renderRecentApps();
}

export function openStartMenu() {
  const menu = startMenuPanelEl();
  if (!menu) return;
  renderRecentApps();
  menu.classList.remove("hidden");
  menu.setAttribute("aria-hidden", "false");
  
  const searchInput = document.querySelector("#startMenuSearch");
  if (searchInput) {
    searchInput.value = "";
    searchInput.dispatchEvent(new Event("input"));
    setTimeout(() => searchInput.focus(), 50);
  }

  if (state.isAnimationEnabled && window.gsap) {
    window.gsap.killTweensOf(menu);
    window.gsap.fromTo(
      menu,
      { autoAlpha: 0, filter: "blur(7px)" },
      { autoAlpha: 1, filter: "blur(0px)", duration: 0.22, ease: "power3.out" },
    );
    window.gsap.fromTo(
      menu.querySelectorAll(".launcher-app, .launcher-recent-item, .start-account-pane, .start-search"),
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.2, stagger: 0.025, ease: "power2.out" },
    );
  }
}

export function closeStartMenu(animate = true) {
  const menu = startMenuPanelEl();
  if (!menu || menu.classList.contains("hidden")) return;
  const finish = () => {
    menu.classList.add("hidden");
    menu.setAttribute("aria-hidden", "true");
    menu.style.opacity = "";
    menu.style.visibility = "";
    menu.style.transform = "";
    menu.style.filter = "";
  };

  if (animate && state.isAnimationEnabled && window.gsap) {
    window.gsap.killTweensOf(menu);
    window.gsap.to(menu, {
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

export function toggleStartMenu() {
  const menu = startMenuPanelEl();
  if (menu?.classList.contains("hidden")) {
    openStartMenu();
  } else {
    closeStartMenu();
  }
}

export function initializeStartMenuSearch() {
  const searchInput = document.querySelector("#startMenuSearch");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    const pinnedApps = document.querySelectorAll(".launcher-app");
    const recommendedApps = document.querySelectorAll(".launcher-recent-item");
    const sections = document.querySelectorAll(".launcher-section");

    let hasPinnedMatches = false;
    pinnedApps.forEach(app => {
      const title = app.querySelector("strong")?.textContent.toLowerCase() || "";
      const subtitle = app.querySelector("small")?.textContent.toLowerCase() || "";
      if (title.includes(query) || subtitle.includes(query)) {
        app.style.display = "";
        hasPinnedMatches = true;
      } else {
        app.style.display = "none";
      }
    });

    let hasRecommendedMatches = false;
    recommendedApps.forEach(app => {
      const title = app.querySelector("strong")?.textContent.toLowerCase() || "";
      const subtitle = app.querySelector("small")?.textContent.toLowerCase() || "";
      if (title.includes(query) || subtitle.includes(query)) {
        app.style.display = "";
        hasRecommendedMatches = true;
      } else {
        app.style.display = "none";
      }
    });

    // Show/hide sections
    sections.forEach(sec => {
      if (sec.classList.contains("launcher-recent-section")) {
        sec.style.display = hasRecommendedMatches ? "" : "none";
      } else {
        sec.style.display = hasPinnedMatches ? "" : "none";
      }
    });

    // Check if we need to show a "No results" element
    let noResults = document.querySelector("#startMenuNoResults");
    if (!hasPinnedMatches && !hasRecommendedMatches) {
      if (!noResults) {
        noResults = document.createElement("div");
        noResults.id = "startMenuNoResults";
        noResults.className = "editor-side-empty";
        noResults.style.cssText = "padding: 40px 20px; text-align: center; color: #8c8c8c; font-size: 14px;";
        noResults.textContent = "No matching apps or recommended tools.";
        document.querySelector(".start-app-pane")?.appendChild(noResults);
      } else {
        noResults.style.display = "block";
      }
    } else {
      if (noResults) noResults.style.display = "none";
    }
  });
}
