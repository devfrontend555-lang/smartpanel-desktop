const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const net = require("net");
const path = require("path");

let serverProcess = null;
let mainWindow = null;
let serverPort = null;

const APP_ROOT = app.getAppPath();
const SERVER_ENTRY = path.join(APP_ROOT, "dist", "index.cjs");
const ICON_PATH = path.join(APP_ROOT, "dist", "public", "app-icon.png");

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => port ? resolve(port) : reject(new Error("Could not allocate a local port")));
    });
  });
}

function startLocalServer(port) {
  return new Promise((resolve, reject) => {
    if (!require("fs").existsSync(SERVER_ENTRY)) {
      reject(new Error(`SmartPanel server build not found at ${SERVER_ENTRY}`));
      return;
    }

    serverProcess = spawn(process.execPath, [SERVER_ENTRY], {
      env: {
        ...process.env,
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: String(port),
        ELECTRON_RUN_AS_NODE: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let startupError = "";
    serverProcess.stderr.on("data", chunk => {
      startupError += chunk.toString();
    });
    serverProcess.on("error", reject);
    serverProcess.on("exit", (code, signal) => {
      if (code !== 0 && mainWindow === null) {
        reject(new Error(startupError || `SmartPanel server stopped (${code ?? signal})`));
      }
    });

    waitForServer(port).then(resolve, error => {
      if (startupError) error.message += `\n${startupError}`;
      reject(error);
    });
  });
}

function waitForServer(port, attempts = 80) {
  return new Promise((resolve, reject) => {
    const probe = remaining => {
      const request = http.get(`http://127.0.0.1:${port}/`, response => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        retry(remaining);
      });
      request.setTimeout(500, () => {
        request.destroy();
        retry(remaining);
      });
      request.on("error", () => retry(remaining));
    };

    const retry = remaining => {
      if (remaining <= 0) {
        reject(new Error("SmartPanel server did not become ready in time"));
        return;
      }
      setTimeout(() => probe(remaining - 1), 150);
    };

    probe(attempts);
  });
}

function stopLocalServer() {
  if (!serverProcess || serverProcess.killed) return;
  serverProcess.kill();
  serverProcess = null;
}

function createWindow() {
  const origin = `http://127.0.0.1:${serverPort}`;
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: "SmartPanel",
    backgroundColor: "#060612",
    icon: ICON_PATH,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(origin)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.loadURL(origin).catch(error => {
    dialog.showErrorBox("SmartPanel ishga tushmadi", error.message);
  });
}

async function launch() {
  try {
    serverPort = await findFreePort();
    await startLocalServer(serverPort);
    createWindow();
  } catch (error) {
    stopLocalServer();
    dialog.showErrorBox(
      "SmartPanel ishga tushmadi",
      error instanceof Error ? error.message : String(error),
    );
    app.quit();
  }
}

app.whenReady().then(launch);

app.on("before-quit", stopLocalServer);
app.on("window-all-closed", () => {
  stopLocalServer();
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (!mainWindow) launch();
});