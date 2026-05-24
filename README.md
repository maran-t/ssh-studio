# SSH OS Bridge UI

A browser-based desktop interface for working with a remote Linux machine over SSH. The app combines a windowed file manager, Monaco-powered text editor, terminal command runner, and upload/download transfer tools behind a small Express server.

## What It Does

- Connects to a remote Linux host with SSH private-key authentication.
- Browses remote folders through SFTP.
- Opens, edits, and saves remote text files.
- Creates, renames, and deletes files or folders.
- Runs shell commands in the current remote working directory.
- Uploads local files to the remote host.
- Downloads selected remote files.
- Shows connection details such as host, distro, shell, and session health.
- Persists connection form values and window layout in browser `localStorage`.

## Tech Stack

- Node.js and Express for the local web server.
- `ssh2` for SSH and SFTP operations.
- Monaco Editor for the in-browser code editor.
- Plain HTML, CSS, and JavaScript for the desktop-style UI.

## Project Structure

```text
.
|-- index.html          # Main desktop UI markup
|-- styles.css          # Windowed desktop styling and responsive UI
|-- script.js           # Client-side app logic
|-- server.js           # Express server, SSH sessions, and API routes
|-- package.json        # npm metadata and start script
|-- package-lock.json   # Locked dependency versions
|-- ssh-os-bridge-ui.zip
```

## Requirements

- Node.js 18 or newer recommended.
- npm.
- Access to a remote Linux host with SSH enabled.
- A PEM/private key accepted by the remote host.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

Open the app:

```text
http://localhost:3000
```

To run on a different port:

```bash
PORT=4000 npm start
```

On Windows PowerShell:

```powershell
$env:PORT=4000; npm start
```

## Desktop App Packaging

Run the app in Electron during development:

```bash
npm run electron
```

Build a Windows desktop app:

```bash
npm run dist
```

Build only the portable Windows executable:

```bash
npm run dist -- --win portable
```

Build output is written to `dist/`. The portable executable is named like `SSH OS Bridge 1.0.0.exe`.

## Using the App

1. Click `Connect SSH`.
2. Enter the host, username, port, and optional start folder.
3. Load or paste the private key.
4. Add the passphrase if the key is encrypted.
5. Sign in.

After connecting, use the taskbar windows:

- `Files` browses remote directories and handles file operations.
- `Editor` opens and saves remote text files.
- `Terminal` runs commands on the remote machine.
- `Transfers` shows upload/download activity.
- `Connection` manages SSH connection settings.

## API Overview

The frontend talks to the local Express server through these routes:

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/connect` | Create an SSH/SFTP session. |
| `GET` | `/api/sessions/:id/list` | List a remote directory. |
| `GET` | `/api/sessions/:id/file` | Read a remote file. |
| `PUT` | `/api/sessions/:id/file` | Save a remote file. |
| `POST` | `/api/sessions/:id/command` | Run a shell command. |
| `POST` | `/api/sessions/:id/file-action` | Create, rename, or delete remote items. |
| `GET` | `/api/sessions/:id/health` | Check whether the SSH session is still alive. |
| `GET` | `/api/sessions/:id/download` | Stream a remote file to the browser. |
| `POST` | `/api/sessions/:id/upload` | Upload a local file to the remote directory. |
| `POST` | `/api/sessions/:id/disconnect` | End the SSH session. |

## Security Notes

- SSH clients and SFTP handles are stored in server memory only.
- The private key is submitted to the local server to create the SSH connection.
- Connection form values are saved in browser `localStorage`; avoid storing sensitive values in shared browsers.
- The terminal route runs arbitrary commands on the connected remote host.
- This app is best run locally or behind trusted network controls. Do not expose it publicly without adding authentication, authorization, HTTPS, and stricter request validation.

## Development Notes

- The server serves static files from the project root.
- Monaco is loaded from `node_modules/monaco-editor/min/vs/loader.js`, so `npm install` is required before using the editor.
- SSH sessions are not persisted. Refreshing or restarting the server requires reconnecting.
- Folder deletion uses SFTP `rmdir`, so non-empty folders may fail to delete depending on the remote server behavior.

## Troubleshooting

- `SSH connection timed out`: confirm the host, port, network access, and SSH daemon status.
- `Host, user, and PEM private key are required`: make sure the connection form includes all required values.
- Editor does not load: run `npm install` and restart the server so Monaco exists under `node_modules`.
- Session expired: reconnect; the server removes sessions when the SSH client closes.
- Upload fails: verify the destination folder is writable by the SSH user.
