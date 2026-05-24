import { state } from './state.js';
import { escapeHtml, showToast } from './ui.js';
import { request, saveActiveSession } from './connection.js';
import { focusWindow } from './windowManager.js';

// DOM Selectors
const terminalLogEl = () => document.querySelector("#terminalLog");
const terminalBodyEl = () => document.querySelector("#terminalBody");
const terminalInputEl = () => document.querySelector("#terminalInput");
const terminalPromptEl = () => document.querySelector("#terminalPrompt");
const runCommandButtonEl = () => document.querySelector("#runCommandButton");

export function parseAnsiColors(text, query = "") {
  let escaped = escapeHtml(text);
  
  if (query) {
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const placeholders = [];
    
    escaped = escaped.replace(/\x1B\[([\d;]*)m/g, (match) => {
      placeholders.push(match);
      return `\x1BPLACEHOLDER_${placeholders.length - 1}\x1B`;
    });
    
    escaped = escaped.replace(regex, `<mark class="terminal-match">$1</mark>`);
    
    escaped = escaped.replace(/\x1BPLACEHOLDER_(\d+)\x1B/g, (match, idx) => {
      return placeholders[parseInt(idx)];
    });
  }
  
  const ansiStyles = {
    "30": "color: #475569;", // Muted black
    "31": "color: #ef5f57; font-weight: bold;", // Red
    "32": "color: #10b981; font-weight: bold;", // Green
    "33": "color: #f59e0b; font-weight: bold;", // Yellow
    "34": "color: #3b82f6; font-weight: bold;", // Blue
    "35": "color: #a855f7; font-weight: bold;", // Magenta
    "36": "color: #06b6d4; font-weight: bold;", // Cyan
    "37": "color: #cbd5e1;", // White
    "1": "font-weight: bold;", // Bold
  };

  const result = escaped.replace(/\x1B\[([\d;]*)m/g, (match, codes) => {
    if (!codes || codes === "0") return "</span>";
    let styles = "";
    codes.split(";").forEach(code => {
      if (ansiStyles[code]) styles += ansiStyles[code];
    });
    return styles ? `<span style="${styles}">` : "";
  });

  const openSpans = (result.match(/<span/g) || []).length;
  const closeSpans = (result.match(/<\/span>/g) || []).length;
  let balanced = result;
  for (let i = 0; i < (openSpans - closeSpans); i++) {
    balanced += "</span>";
  }
  return balanced;
}

export function renderTerminalLog(lines = state.logLines, query = "") {
  const log = terminalLogEl();
  if (!log) return;
  log.innerHTML = lines
    .slice(-120)
    .map((entry) => `<span class="terminal-line ${entry.type || "stdout"}">${parseAnsiColors(entry.text, query)}</span>`)
    .join("");
  const body = terminalBodyEl();
  if (body) {
    body.scrollTop = body.scrollHeight;
  }
}

export function pushTerminal(text, type = "stdout") {
  if (!text) return;
  
  let str = String(text);
  if (str.endsWith("\n")) {
    str = str.slice(0, -1);
  }
  if (str.endsWith("\r")) {
    str = str.slice(0, -1);
  }
  
  const lines = str.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  
  lines.forEach((line) => {
    const cleanLine = line.endsWith("\r") ? line.slice(0, -1) : line;
    state.logLines.push({ type, text: cleanLine });
  });
    
  renderTerminalLog();
}

export function command(line, output = "") {
  const promptPath = state.terminalCwd || state.session?.startPath || "~";
  const prefix = state.session ? `${state.session.username}@${state.session.host}:${promptPath} $` : "local $";
  pushTerminal(`${prefix} ${line}`, "command");
  if (output) pushTerminal(output);
}

export function updateTerminalPrompt() {
  const el = terminalPromptEl();
  if (!el) return;
  const promptPath = state.terminalCwd || state.session?.startPath || "~";
  el.textContent = state.session ? `${state.session.username}@${state.session.host}:${promptPath} $` : "local $";
}

export function focusTerminalInputAtBottom() {
  const input = terminalInputEl();
  if (input) {
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
  }
}

export async function runTerminalCommand() {
  const input = terminalInputEl();
  if (!input) return;
  const line = input.value.trim();
  if (!line) return;

  focusWindow("terminalWindow");
  input.value = "";
  state.commandHistory.push(line);
  state.commandHistoryIndex = state.commandHistory.length;
  if (!state.session) {
    command(line, "Connect to SSH first.");
    return;
  }

  const runBtn = runCommandButtonEl();
  if (runBtn) runBtn.disabled = true;
  command(line);
  try {
    const data = await request(`/api/sessions/${state.session.id}/command`, {
      method: "POST",
      body: JSON.stringify({ command: line, cwd: state.terminalCwd || state.session.startPath || "." }),
    });
    if (data.stdout) pushTerminal(data.stdout, "stdout");
    if (data.stderr) pushTerminal(data.stderr, "stderr");
    if (data.code) pushTerminal(`exit code ${data.code}`, "exit");
    if (data.cwd && data.cwd !== state.terminalCwd) {
      state.terminalCwd = data.cwd;
      saveActiveSession(state.currentPath);
      updateTerminalPrompt();
    }
  } catch (error) {
    pushTerminal(error.message, "error");
  } finally {
    if (runBtn) runBtn.disabled = false;
    input.focus();
  }
}
