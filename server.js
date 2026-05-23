const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("ssh2");
const express = require("express");

const app = express();
const port = Number(process.env.PORT || 3000);
const sessions = new Map();

app.use(express.json({ limit: "2mb" }));
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
    sftpClient.writeFile(remotePath, contents, "utf8", (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
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
      session: {
        id,
        host,
        username,
        port: session.port,
        startPath: listing.path,
        distro,
        shell,
        auth: session.auth,
      },
      ...listing,
    });
  } catch (error) {
    res.status(502).json({ error: error.message || "SSH connection failed." });
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

process.on("SIGINT", () => {
  for (const session of sessions.values()) session.client.end();
  process.exit(0);
});

app.listen(port, () => {
  const hasPackage = fs.existsSync(path.join(__dirname, "package.json"));
  console.log(`SSH OS Bridge listening at http://localhost:${port}`);
  if (!hasPackage) console.log("Run npm install before starting the server.");
});
