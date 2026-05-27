import { Terminal } from '../node_modules/@xterm/xterm/lib/xterm.mjs';
import { FitAddon } from '../node_modules/@xterm/addon-fit/lib/addon-fit.mjs';
import { state } from './state.js';
import { escapeHtml, showToast } from './ui.js';
import { focusWindow } from './windowManager.js';

const terminalMountEl = () => document.querySelector("#terminalMount");
const terminalStatusEl = () => document.querySelector("#terminalStatus");
const terminalWindowEl = () => document.querySelector("#terminalWindow");

let terminal = null;
let fitAddon = null;
let terminalSocket = null;
let terminalSessionId = null;
let terminalResizeObserver = null;
let pendingFitTimer = null;

function setTerminalStatus(text = "", tone = "") {
  const status = terminalStatusEl();
  if (!status) return;
  status.textContent = text;
  status.dataset.tone = tone;
  status.classList.toggle("hidden", !text);
}

function isTerminalVisible() {
  const terminalWindow = terminalWindowEl();
  return Boolean(
    terminalWindow &&
      !terminalWindow.classList.contains("minimized") &&
      !terminalWindow.classList.contains("closed"),
  );
}

function sendTerminalMessage(message) {
  if (!terminalSocket || terminalSocket.readyState !== WebSocket.OPEN) return;
  terminalSocket.send(JSON.stringify(message));
}

function fitTerminal() {
  if (!terminal || !fitAddon || !isTerminalVisible()) return;
  try {
    fitAddon.fit();
    sendTerminalMessage({
      type: "resize",
      cols: terminal.cols,
      rows: terminal.rows,
    });
  } catch {
    // xterm fit can briefly fail while the window animation is mid-layout.
  }
}

function scheduleFitTerminal() {
  window.clearTimeout(pendingFitTimer);
  pendingFitTimer = window.setTimeout(fitTerminal, 80);
}

function terminalUrl() {
  if (!state.session?.id) return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({
    cols: String(terminal?.cols || 100),
    rows: String(terminal?.rows || 30),
    cwd: state.terminalCwd || state.session.startPath || ".",
  });
  if (state.apiToken) {
    params.set("token", state.apiToken);
  }
  return `${protocol}//${window.location.host}/terminal/${encodeURIComponent(state.session.id)}?${params}`;
}

export function initializeNativeTerminal() {
  const mount = terminalMountEl();
  if (!mount || terminal) return;

  terminal = new Terminal({
    allowProposedApi: false,
    convertEol: true,
    cursorBlink: true,
    cursorStyle: "bar",
    fontFamily: '"Cascadia Mono", "JetBrains Mono", Consolas, monospace',
    fontSize: 13,
    lineHeight: 1.28,
    scrollback: 5000,
    tabStopWidth: 4,
    theme: {
      background: "#101820",
      foreground: "#d7f8e8",
      cursor: "#74d89a",
      cursorAccent: "#101820",
      selectionBackground: "#264f78",
      black: "#0b1118",
      red: "#ef5f57",
      green: "#74d89a",
      yellow: "#f2bd45",
      blue: "#5aa7ff",
      magenta: "#c678dd",
      cyan: "#56b6c2",
      white: "#d7f8e8",
      brightBlack: "#5f6b7a",
      brightRed: "#ff7b72",
      brightGreen: "#9be9a8",
      brightYellow: "#ffd166",
      brightBlue: "#79c0ff",
      brightMagenta: "#d2a8ff",
      brightCyan: "#7ee7f1",
      brightWhite: "#ffffff",
    },
  });
  fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(mount);

  terminal.attachCustomKeyEventHandler((event) => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "c") {
      if (event.type === "keydown") {
        const selection = terminal.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection);
          showToast("Copied terminal selection", "success");
        }
      }
      return false;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "v") {
      if (event.type === "keydown") {
        navigator.clipboard.readText().then((text) => {
          if (terminalSocket?.readyState === WebSocket.OPEN) {
            sendTerminalMessage({ type: "input", data: text });
          }
        });
      }
      return false;
    }
    return true;
  });

  terminal.onData((data) => {
    if (terminalSocket?.readyState === WebSocket.OPEN) {
      sendTerminalMessage({ type: "input", data });
      return;
    }
    if (state.session) attachTerminal();
  });

  terminal.onResize(({ cols, rows }) => {
    sendTerminalMessage({ type: "resize", cols, rows });
  });

  terminalResizeObserver = new ResizeObserver(scheduleFitTerminal);
  terminalResizeObserver.observe(mount);
  window.addEventListener("resize", scheduleFitTerminal);
  document.addEventListener("windowFocused", (event) => {
    if (event.detail?.id !== "terminalWindow") return;
    scheduleFitTerminal();
    if (state.session) attachTerminal();
    else writeTerminalNotice("Connect to SSH to start a terminal.");
  });
  document.addEventListener("windowResized", (event) => {
    if (event.detail?.id === "terminalWindow") scheduleFitTerminal();
  });

  writeTerminalNotice("Connect to SSH to start a terminal.");
  scheduleFitTerminal();
}

export function attachTerminal() {
  initializeNativeTerminal();
  if (!terminal || !state.session) {
    setTerminalStatus("Connect to SSH to start a terminal.", "warn");
    return;
  }

  if (terminalSocket?.readyState === WebSocket.OPEN && terminalSessionId === state.session.id) {
    scheduleFitTerminal();
    terminal.focus();
    return;
  }

  detachTerminal(false);
  terminalSessionId = state.session.id;
  setTerminalStatus(`Connecting terminal to ${state.session.username}@${state.session.host}...`, "");
  terminal.writeln(`\x1b[32mStarting SSH terminal for ${state.session.username}@${state.session.host}\x1b[0m`);

  const socket = new WebSocket(terminalUrl());
  terminalSocket = socket;
  socket.addEventListener("open", () => {
    setTerminalStatus("", "");
    scheduleFitTerminal();
    terminal.focus();
  });
  socket.addEventListener("message", (event) => {
    terminal.write(String(event.data));
  });
  socket.addEventListener("close", () => {
    if (terminalSocket !== socket) return;
    const wasActiveSession = terminalSessionId === state.session?.id;
    terminalSocket = null;
    terminalSessionId = null;
    if (wasActiveSession) setTerminalStatus("Terminal disconnected. Reopen or type to reconnect.", "warn");
  });
  socket.addEventListener("error", () => {
    if (terminalSocket !== socket) return;
    setTerminalStatus("Terminal connection failed.", "error");
  });
}

export function detachTerminal(clearSession = true) {
  if (terminalSocket) {
    terminalSocket.close();
    terminalSocket = null;
  }
  if (clearSession) terminalSessionId = null;
}

export function parseAnsiColors(text, query = "") {
  let escaped = escapeHtml(text);
  if (query) {
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    escaped = escaped.replace(new RegExp(`(${escapedQuery})`, "gi"), "<mark class=\"terminal-match\">$1</mark>");
  }
  return escaped;
}

export function renderTerminalLog() {
  if (!terminal) initializeNativeTerminal();
}

export function pushTerminal(text, type = "stdout") {
  if (!text) return;
  const value = String(text).replace(/\n/g, "\r\n");
  state.logLines.push({ type, text: String(text) });
  if (!terminal) initializeNativeTerminal();
  if (!terminal) return;
  const color = type === "error" || type === "stderr" ? "\x1b[31m" : type === "command" ? "\x1b[32m" : "";
  const reset = color ? "\x1b[0m" : "";
  terminal.writeln(`${color}${value}${reset}`);
}

export function command(line, output = "") {
  if (terminalSocket?.readyState === WebSocket.OPEN) {
    sendTerminalMessage({ type: "input", data: `${line}\r` });
    return;
  }
  const promptPath = state.terminalCwd || state.session?.startPath || "~";
  const prefix = state.session ? `${state.session.username}@${state.session.host}:${promptPath} $` : "local $";
  pushTerminal(`${prefix} ${line}`, "command");
  if (output) pushTerminal(output);
}

export function updateTerminalPrompt() {
  if (state.session && isTerminalVisible()) attachTerminal();
}

export function focusTerminalInputAtBottom() {
  if (!terminal) initializeNativeTerminal();
  if (state.session) attachTerminal();
  terminal?.focus();
}

export async function runTerminalCommand() {
  focusWindow("terminalWindow");
  focusTerminalInputAtBottom();
}

export function disposeNativeTerminal() {
  detachTerminal();
  terminalResizeObserver?.disconnect();
  terminalResizeObserver = null;
  terminal?.dispose();
  terminal = null;
  fitAddon = null;
}

function writeTerminalNotice(text) {
  if (!terminal || state.session) return;
  setTerminalStatus(text, "warn");
}
