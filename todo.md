# SSH OS Bridge UI — TODO

A working punch list derived from a walkthrough of the repo (README, `package.json`, `server.js`, `electron-main.js`, `js/`, `css/`, git status). Items are grouped by theme and roughly ordered by impact. Check off as you go.

## Repo Hygiene

- [ ] Review and commit (or revert) the currently staged changes: `css/desktop.css`, `electron-main.js`, `index.html`, `js/editor.js`, `js/startMenu.js`, `js/ui.js`, `package.json`, `preload.js`, `script.js`, `server.js`.
- [ ] Review the unstaged changes in `css/desktop.css`, `css/editor.css`, `css/terminal.css`, `electron-main.js`, `index.html`, `js/connection.js`, `js/editor.js`, `js/fileManager.js`, `js/state.js`, `js/terminal.js`, `.gitignore` and either commit or discard.
- [ ] Add `server.codex.log` and `server.codex.err.log` to `.gitignore` (or remove them from the repo); the existing `.gitignore` already covers `*.log` but the files are tracked.
- [ ] Confirm `ssh-os-bridge-ui.zip` should not live in the repo; if it's a build artifact, ignore it.
- [ ] De-duplicate `.gitignore` — `node_modules/`, `/node_modules`, `dist`, `coverage`, npm/yarn debug logs, and a few other entries appear twice.
- [ ] Pick a single line-ending and EOL policy; add a `.editorconfig` and `.gitattributes` so Windows/Linux contributors get consistent diffs.

## Testing & Quality

- [ ] No test framework is configured. Pick one (Jest or Vitest for unit, Playwright for end-to-end against the Electron build) and wire `npm test`.
- [ ] Add unit tests for `server.js` helpers: `shellQuote`, `exec`, `execDetailed`, session lifecycle.
- [ ] Add integration tests for the Express routes documented in the README (`/api/connect`, `/api/sessions/:id/list`, file read/write, command, file-action, health, download, upload, disconnect).
- [ ] Add at least one smoke test that boots the Electron main process and confirms the window loads `http://127.0.0.1:<port>`.
- [ ] Wire ESLint and Prettier into an `npm run lint` / `npm run format` script (configs `.eslintrc.json` and `.prettierrc` are already present but not exposed via scripts).
- [ ] Add a GitHub Actions (or equivalent) workflow that runs install + lint + tests on push/PR.

## Security

- [ ] The README acknowledges that the terminal route runs arbitrary commands on the connected host. Add explicit per-request authentication (bearer token from `electron-main.js` is good — verify every route checks it, including the WebSocket handshake for the terminal).
- [ ] Audit `app.use(express.static(__dirname))` — it serves the entire project root, including `package.json`, `electron-main.js`, and any logs. Restrict to a `public/` (or explicit) subdirectory.
- [ ] Tighten body-parser limits (`100mb` JSON/urlencoded is generous and a DoS vector) — uploads should go through a streaming multipart endpoint instead.
- [ ] Validate and clamp all path inputs (`/api/sessions/:id/file`, file-action, download) so a session can't be tricked into traversing outside the user's home (or into device files) via crafted absolute paths.
- [ ] Revisit private-key handling: the key is POSTed to the local server. Document the threat model in the README, and consider keeping the key entirely in the Electron main process (passed to `ssh2` directly) rather than round-tripping through HTTP.
- [ ] Remove or gate the `localStorage` persistence of connection form values when running outside Electron; the README warns about this but the code still saves.
- [ ] Add CSRF protection or origin-check the local Express server so a random browser page can't hit `http://127.0.0.1:<port>` while the app is running.
- [ ] Pin the `ssh2` known-hosts file (`~/.ssh_os_bridge_hosts.json`) behavior and surface host-key mismatches to the user with a real prompt rather than auto-accepting.

## Reliability

- [ ] Folder deletion uses SFTP `rmdir` (README note). Add a recursive delete with a clear confirmation dialog for non-empty folders.
- [ ] Add reconnect logic for dropped SSH sessions; today, refresh or server restart forces the user to reconnect manually.
- [ ] Surface upload/download progress and errors uniformly — `electron-main.js` has a custom `start-download` IPC path that bypasses the in-browser transfers UI; unify them.
- [ ] Persist (or at least cleanly reap) entries in `activeUploads` and `terminalSockets` on disconnect / app quit.
- [ ] Add timeouts and friendly error messages for slow SFTP operations (large directory listings, big file reads).
- [ ] Handle binary-file edits gracefully in the Monaco editor (detect by content sniff and warn before opening).

## UX / Frontend

- [ ] Split `script.js` (~59 KB) and `index.html` (~58 KB) further — the `js/` directory is partway through a module breakout (`connection.js`, `editor.js`, `fileManager.js`, `startMenu.js`, `state.js`, `terminal.js`, `transfers.js`, `ui.js`, `windowManager.js`). Finish migrating leftover logic out of `script.js`.
- [ ] Replace the inline `<style>` blocks in `index.html` with the existing files under `css/`.
- [ ] Add keyboard shortcuts panel (Cmd/Ctrl+S, Cmd/Ctrl+W, etc.) and document them in the README.
- [ ] Accessibility pass: focus rings, ARIA labels on windowed widgets, color-contrast check against the dark theme.
- [ ] Polish the terminal: handle resize on window-resize (xterm `fit` addon is already a dep but verify it fires), copy/paste shortcuts, scroll-lock.
- [ ] Add a "Recent connections" list with friendly names (not just the last-used form values).

## Packaging & Distribution

- [ ] `package.json` `build.files` whitelist must stay in sync with the actual on-disk layout — verify `js/**/*` and `css/**/*` cover everything currently shipped.
- [ ] Add a macOS and Linux target to `electron-builder` (`mac.target`, `linux.target`) so the app isn't Windows-only.
- [ ] Code-sign the Windows build (or document that it's unsigned and how to bypass SmartScreen).
- [ ] Set up `electron-updater` (or document a manual upgrade path) so users can move past 1.0.0 without re-downloading.
- [ ] Add an app icon (`icon.ico` / `icon.icns` / `icon.png`) and wire it into the `electron-builder` config.

## Documentation

- [ ] Update the README's "Project Structure" tree — it predates the `js/`, `css/`, `dist/`, `electron-main.js`, and `preload.js` additions.
- [ ] Document the IPC API in `preload.js` (what the renderer can call and why).
- [ ] Add a `CONTRIBUTING.md` with the dev loop (`npm install`, `npm start`, `npm run electron`) and lint/format expectations.
- [ ] Add a `CHANGELOG.md` and start versioning entries per release.
- [ ] Document the auth-token flow between Electron main and the renderer (the bearer token from `electron-main.js`).

## Nice-to-Have / Future

- [ ] Multi-pane file manager (dual-pane like Total Commander) for quick local↔remote copies.
- [ ] Saved snippets / scripts that can be run on the remote via the terminal pane.
- [ ] Session tabs so multiple hosts can be open at once.
- [ ] Search across remote files (server-side `grep` wrapper with rate-limiting).
- [ ] Git status integration in the file manager (badges on tracked files).
- [ ] Optional dark/light theme toggle.
