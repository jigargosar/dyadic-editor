// Electron main process: creates a single BrowserWindow booting to the empty editor.
import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Single window reference (this app only ever needs one)
let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      // Preload bridges main <-> renderer over contextBridge
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Dev: load Vite dev server; Prod: load built index.html
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

// Phase 4 will change this to hide-to-tray; for now standard quit.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
