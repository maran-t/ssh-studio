const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("ssh2");
const express = require("express");
const { WebSocketServer } = require("ws");

const app = express();
const port = Number(process.env.PORT || 3000);
const sessions = new Map();
const terminalSockets = new Set();
let serverInstance = null;
let terminalWss = null;

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(express.static(__dirname));

function exec(client, command) {
  return new Promise((resolve, reject) => {
    client.exec(command, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }

      let stdout = "";
      let stderr = "";
      stream
        .on("close", (code) => {
          if (code && stderr) reject(new Error(stderr.trim()));
          else resolve(stdout.trim());
        })
        .on("data", (chunk) => {
          stdout += chunk.toString();
        });
      stream.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    });
  });
}

function execDetailed(client, command) {
  return new Promise((resolve, reject) => {
    client.exec(command, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }

      let stdout = "";
      let stderr = "";
      stream
        .on("close", (code) => {
          resolve({ stdout, stderr, code });
        })
        .on("data", (chunk) => {
          stdout += chunk.toString();
        });
      stream.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    });
  });
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function closeTerminalSocket(socket, code = 1000, reason = "Terminal closed") {
  try {
    if (socket.readyState === 1) socket.close(code, reason);
  } catch {
    // Socket cleanup should not affect app shutdown.
  }
}

function attachTerminalWebSocket(socket, req) {
  terminalSockets.add(socket);

  const url = new URL(req.url, "http://127.0.0.1");
  const sessionId = decodeURIComponent(url.pathname.split("/").pop() || "");
  const session = sessions.get(sessionId);
  const cols = Math.max(20, Math.min(240, Number(url.searchParams.get("cols") || 100)));
  const rows = Math.max(8, Math.min(80, Number(url.searchParams.get("rows") || 30)));
  const cwd = url.searchParams.get("cwd") || session?.startPath || ".";
  let shellStream = null;

  const cleanup = () => {
    terminalSockets.delete(socket);
    if (shellStream) {
      shellStream.removeAllListeners();
      try {
        shellStream.end();
      } catch {
        // The remote shell may already be gone.
      }
      shellStream = null;
    }
  };

  socket.on("close", cleanup);
  socket.on("error", cleanup);

  if (!session) {
    socket.send("\r\nSSH session is not active. Connect again.\r\n");
    closeTerminalSocket(socket, 4004, "Missing SSH session");
    return;
  }

  session.client.shell(
    {
      term: "xterm-256color",
      cols,
      rows,
      modes: {
        ECHO: 1,
        TTY_OP_ISPEED: 14400,
        TTY_OP_OSPEED: 14400,
      },
    },
    (error, stream) => {
      if (error) {
        socket.send(`\r\nUnable to start remote terminal: ${error.message || error}\r\n`);
        closeTerminalSocket(socket, 1011, "Terminal startup failed");
        return;
      }

      shellStream = stream;
      stream
        .on("data", (chunk) => {
          if (socket.readyState === socket.OPEN) socket.send(chunk.toString("utf8"));
        })
        .on("close", () => {
          if (socket.readyState === socket.OPEN) socket.send("\r\nRemote terminal closed.\r\n");
          closeTerminalSocket(socket, 1000, "Remote terminal closed");
        })
        .on("error", (streamError) => {
          if (socket.readyState === socket.OPEN) {
            socket.send(`\r\nRemote terminal error: ${streamError.message || streamError}\r\n`);
          }
          closeTerminalSocket(socket, 1011, "Remote terminal error");
        });

      stream.stderr?.on("data", (chunk) => {
        if (socket.readyState === socket.OPEN) socket.send(chunk.toString("utf8"));
      });

      if (cwd && cwd !== ".") stream.write(`cd ${shellQuote(cwd)}\r`);
    },
  );

  socket.on("message", (raw) => {
    if (!shellStream) return;
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === "input") {
      shellStream.write(String(message.data || ""));
    } else if (message.type === "resize") {
      const nextCols = Math.max(20, Math.min(240, Number(message.cols || cols)));
      const nextRows = Math.max(8, Math.min(80, Number(message.rows || rows)));
      shellStream.setWindow(nextRows, nextCols, 0, 0);
    }
  });
}

function sftp(client) {
  return new Promise((resolve, reject) => {
    client.sftp((error, value) => {
      if (error) reject(error);
      else resolve(value);
    });
  });
}

function realpath(sftpClient, remotePath) {
  return new Promise((resolve, reject) => {
    sftpClient.realpath(remotePath, (error, resolvedPath) => {
      if (error) reject(error);
      else resolve(resolvedPath);
    });
  });
}

function readdir(sftpClient, remotePath) {
  return new Promise((resolve, reject) => {
    sftpClient.readdir(remotePath, (error, list) => {
      if (error) reject(error);
      else resolve(list);
    });
  });
}

function readFile(sftpClient, remotePath) {
  return new Promise((resolve, reject) => {
    sftpClient.readFile(remotePath, "utf8", (error, contents) => {
      if (error) reject(error);
      else resolve(contents);
    });
  });
}

function writeFile(sftpClient, remotePath, contents) {
  return new Promise((resolve, reject) => {
    const encoding = Buffer.isBuffer(contents) ? undefined : "utf8";
    sftpClient.writeFile(remotePath, contents, encoding, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function unlinkPath(sftpClient, remotePath) {
  return new Promise((resolve, reject) => {
    sftpClient.unlink(remotePath, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function rmdirPath(sftpClient, remotePath) {
  return new Promise((resolve, reject) => {
    sftpClient.rmdir(remotePath, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function rmdirRecursive(sftpClient, remotePath) {
  const list = await readdir(sftpClient, remotePath);
  for (const item of list) {
    if (item.filename === "." || item.filename === "..") continue;
    const fullPath = remotePath.endsWith("/") ? `${remotePath}${item.filename}` : `${remotePath}/${item.filename}`;
    if (item.attrs.isDirectory()) {
      await rmdirRecursive(sftpClient, fullPath);
    } else {
      await unlinkPath(sftpClient, fullPath);
    }
  }
  await rmdirPath(sftpClient, remotePath);
}

function mkdirPath(sftpClient, remotePath) {
  return new Promise((resolve, reject) => {
    sftpClient.mkdir(remotePath, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function renamePath(sftpClient, fromPath, toPath) {
  return new Promise((resolve, reject) => {
    sftpClient.rename(fromPath, toPath, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function statPath(sftpClient, remotePath) {
  return new Promise((resolve, reject) => {
    sftpClient.stat(remotePath, (error, attrs) => {
      if (error) reject(error);
      else resolve(attrs);
    });
  });
}

function joinRemotePath(basePath, name) {
  const cleanName = String(name || "").replace(/^\/+/, "");
  if (!cleanName || cleanName.includes("\0") || cleanName.includes("/")) {
    throw new Error("Use a simple file or folder name.");
  }
  return `${String(basePath || "/").replace(/\/$/, "")}/${cleanName}`.replace(/^\/\//, "/");
}

function formatSize(attrs) {
  if (attrs.isDirectory()) return "-";
  const size = attrs.size || 0;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

function formatModified(attrs) {
  return new Intl.DateTimeFormat([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(attrs.mtime * 1000));
}

async function listPath(session, requestedPath) {
  const resolvedPath = await realpath(session.sftp, requestedPath || ".");
  const list = await readdir(session.sftp, resolvedPath);
  const items = list
    .filter((item) => item.filename !== "." && item.filename !== "..")
    .map((item) => ({
      name: item.filename,
      type: item.attrs.isDirectory() ? "dir" : "file",
      size: formatSize(item.attrs),
      modified: formatModified(item.attrs),
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  return { path: resolvedPath, items };
}

function publicSession(session, startPath) {
  return {
    id: session.id,
    host: session.host,
    username: session.username,
    port: session.port,
    startPath,
    distro: session.distro,
    shell: session.shell,
    auth: session.auth,
  };
}

function connectSsh(config) {
  return new Promise((resolve, reject) => {
    const client = new Client();
    const timeout = setTimeout(() => {
      client.end();
      reject(new Error("SSH connection timed out"));
    }, 20000);

    client
      .on("ready", () => {
        clearTimeout(timeout);
        resolve(client);
      })
      .on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      })
      .connect(config);
  });
}

app.post("/api/connect", async (req, res) => {
  const { host, username, port: sshPort, privateKey, passphrase, startPath } = req.body || {};
  if (!host || !username || !privateKey) {
    res.status(400).json({ error: "Host, user, and PEM private key are required." });
    return;
  }

  try {
    const client = await connectSsh({
      host,
      username,
      port: Number(sshPort || 22),
      privateKey,
      passphrase: passphrase || undefined,
      readyTimeout: 20000,
    });
    const sftpClient = await sftp(client);
    const distro =
      (await exec(client, "cat /etc/os-release 2>/dev/null | grep '^PRETTY_NAME=' | cut -d= -f2- | tr -d '\"'").catch(() => "")) ||
      "Remote Linux";
    const shell = (await exec(client, "printf \"$SHELL\"").catch(() => "")) || "unknown shell";
    const id = crypto.randomUUID();
    const session = {
      id,
      host,
      username,
      port: Number(sshPort || 22),
      startPath: startPath || ".",
      distro,
      shell,
      auth: "PEM key",
      client,
      sftp: sftpClient,
    };
    sessions.set(id, session);
    client.on("close", () => sessions.delete(id));

    const listing = await listPath(session, startPath || ".");
    res.json({
      session: publicSession(session, listing.path),
      ...listing,
    });
  } catch (error) {
    res.status(502).json({ error: error.message || "SSH connection failed." });
  }
});

app.get("/api/sessions/:id", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({
      error: "SSH session is not active. Connect again.",
      activeSessions: sessions.size,
    });
    return;
  }

  try {
    await exec(session.client, "printf ok");
  } catch (error) {
    sessions.delete(req.params.id);
    res.status(502).json({ error: error.message || "SSH session health check failed." });
    return;
  }

  try {
    const listing = await listPath(session, req.query.path || session.startPath);
    res.json({
      session: publicSession(session, listing.path),
      ...listing,
    });
  } catch (error) {
    try {
      const fallbackListing = await listPath(session, session.startPath || ".");
      res.json({
        session: publicSession(session, fallbackListing.path),
        warning: error.message || "Unable to restore the previous folder.",
        ...fallbackListing,
      });
    } catch (fallbackError) {
      res.json({
        session: publicSession(session, session.startPath || "."),
        warning: fallbackError.message || error.message || "Unable to list the remote folder.",
        path: session.startPath || ".",
        items: [],
      });
    }
  }
});

app.get("/api/sessions/:id/list", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: "SSH session is not active. Connect again." });
    return;
  }

  try {
    res.json(await listPath(session, req.query.path || session.startPath));
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to read remote folder." });
  }
});

app.get("/api/sessions/:id/file", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: "SSH session is not active. Connect again." });
    return;
  }

  try {
    const remotePath = await realpath(session.sftp, req.query.path);
    const contents = await readFile(session.sftp, remotePath);
    res.json({ path: remotePath, contents });
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to read remote file." });
  }
});

app.put("/api/sessions/:id/file", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: "SSH session is not active. Connect again." });
    return;
  }

  try {
    const remotePath = await realpath(session.sftp, req.body.path);
    await writeFile(session.sftp, remotePath, req.body.contents || "");
    res.json({ path: remotePath, ok: true });
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to save remote file." });
  }
});

app.post("/api/sessions/:id/command", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: "SSH session is not active. Connect again." });
    return;
  }

  const command = String(req.body?.command || "").trim();
  const cwd = req.body?.cwd || session.startPath || ".";
  if (!command) {
    res.status(400).json({ error: "Command is required." });
    return;
  }

  try {
    const script = [
      `cd ${shellQuote(cwd)} 2>/dev/null || true`,
      "{",
      command,
      "}",
      "__code=$?",
      "printf '\\n__SSH_BRIDGE_EXIT__:%s\\n' \"$__code\"",
      "printf '__SSH_BRIDGE_PWD__:%s\\n' \"$PWD\"",
    ].join("\n");
    const result = await execDetailed(session.client, script);
    const exitMatch = result.stdout.match(/\n__SSH_BRIDGE_EXIT__:(\d+)\n/);
    const pwdMatch = result.stdout.match(/__SSH_BRIDGE_PWD__:(.*)\n?$/);
    const stdout = result.stdout
      .replace(/\n__SSH_BRIDGE_EXIT__:\d+\n__SSH_BRIDGE_PWD__:.*\n?$/s, "")
      .trimEnd();
    res.json({
      stdout,
      stderr: result.stderr.trimEnd(),
      code: exitMatch ? Number(exitMatch[1]) : result.code,
      cwd: pwdMatch ? pwdMatch[1] : cwd,
    });
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to run command." });
  }
});

app.post("/api/sessions/:id/file-action", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: "SSH session is not active. Connect again." });
    return;
  }

  const { action, path: requestedPath, name, targetName, type } = req.body || {};
  try {
    const basePath = await realpath(session.sftp, requestedPath || session.startPath || ".");
    if (action === "new-file") {
      await writeFile(session.sftp, joinRemotePath(basePath, name), "");
    } else if (action === "new-folder") {
      await mkdirPath(session.sftp, joinRemotePath(basePath, name));
    } else if (action === "rename") {
      await renamePath(session.sftp, joinRemotePath(basePath, name), joinRemotePath(basePath, targetName));
    } else if (action === "delete") {
      const targetPath = joinRemotePath(basePath, name);
      const attrs = type ? { isDirectory: () => type === "dir" } : await statPath(session.sftp, targetPath);
      if (attrs.isDirectory()) await rmdirRecursive(session.sftp, targetPath);
      else await unlinkPath(session.sftp, targetPath);
    } else {
      res.status(400).json({ error: "Unknown file action." });
      return;
    }
    res.json({ ok: true, ...(await listPath(session, basePath)) });
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to complete file action." });
  }
});

app.get("/api/sessions/:id/health", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: "SSH session is not active. Connect again." });
    return;
  }

  try {
    await exec(session.client, "printf ok");
    res.json({ ok: true });
  } catch (error) {
    sessions.delete(req.params.id);
    res.status(502).json({ error: error.message || "SSH session health check failed." });
  }
});

app.get("/api/sessions/:id/download", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: "SSH session is not active. Connect again." });
    return;
  }

  try {
    const remotePath = await realpath(session.sftp, req.query.path);
    const filename = path.basename(remotePath);
    const stat = await statPath(session.sftp, remotePath);
    
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", stat.size);

    const stream = session.sftp.createReadStream(remotePath);
    stream.on("error", (err) => {
      if (!res.headersSent) {
        res.status(502).json({ error: err.message || "Failed to download file." });
      }
    });
    stream.pipe(res);
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to download file." });
  }
});

app.post("/api/sessions/:id/upload", async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: "SSH session is not active. Connect again." });
    return;
  }

  const { name, path: remoteDir, base64 } = req.body || {};
  if (!name || !remoteDir || !base64) {
    res.status(400).json({ error: "Missing name, remote dir path, or Base64 payload." });
    return;
  }

  try {
    const remotePath = joinRemotePath(remoteDir, name);
    const buffer = Buffer.from(base64, "base64");
    
    await writeFile(session.sftp, remotePath, buffer);
    res.json({ ok: true, ...(await listPath(session, remoteDir)) });
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to upload file." });
  }
});

app.post("/api/sessions/:id/disconnect", (req, res) => {
  const session = sessions.get(req.params.id);
  if (session) {
    session.client.end();
    sessions.delete(req.params.id);
  }
  res.json({ ok: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

function closeSessions() {
  for (const socket of terminalSockets) closeTerminalSocket(socket);
  terminalSockets.clear();
  for (const session of sessions.values()) session.client.end();
  sessions.clear();
}

function startServer(options = {}) {
  const listenPort = Number(options.port ?? process.env.PORT ?? port);
  if (serverInstance) return Promise.resolve(serverInstance);

  const listen = (targetPort, canFallback) => new Promise((resolve, reject) => {
    serverInstance = app
      .listen(targetPort, () => {
        const address = serverInstance.address();
        const actualPort = typeof address === "object" && address ? address.port : targetPort;
        const hasPackage = fs.existsSync(path.join(__dirname, "package.json"));
        terminalWss = new WebSocketServer({ noServer: true });
        terminalWss.on("connection", attachTerminalWebSocket);
        serverInstance.on("upgrade", (req, socket, head) => {
          if (!req.url?.startsWith("/terminal/")) {
            socket.destroy();
            return;
          }
          terminalWss.handleUpgrade(req, socket, head, (ws) => {
            terminalWss.emit("connection", ws, req);
          });
        });
        console.log(`SSH OS Bridge listening at http://localhost:${actualPort}`);
        if (!hasPackage) console.log("Run npm install before starting the server.");
        resolve(serverInstance);
      })
      .on("error", (error) => {
        serverInstance = null;
        if (canFallback && error.code === "EADDRINUSE") {
          console.warn(`Port ${targetPort} is already in use. Falling back to a random free port.`);
          listen(0, false).then(resolve, reject);
          return;
        }
        reject(error);
      });
  });

  return listen(listenPort, listenPort !== 0);
}

function stopServer() {
  closeSessions();
  return new Promise((resolve) => {
    if (!serverInstance) {
      resolve();
      return;
    }
    if (terminalWss) {
      terminalWss.close();
      terminalWss = null;
    }
    serverInstance.close(() => {
      serverInstance = null;
      resolve();
    });
  });
}

if (require.main === module) {
  process.on("SIGINT", async () => {
    await stopServer();
    process.exit(0);
  });
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { app, startServer, stopServer };
