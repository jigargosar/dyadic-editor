// Electron main process: creates a single BrowserWindow booting to the empty editor.
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as db from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Single window reference (this app only ever needs one)
let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      // Preload bridges main <-> renderer over contextBridge
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // TEMP DEBUG: surface renderer console + crashes into the main-process log.
  win.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log('[renderer]', message, `(${sourceId}:${line})`)
  })
  win.webContents.on('render-process-gone', (e, details) => {
    console.log('[renderer-gone]', JSON.stringify(details))
  })
  win.webContents.on('did-fail-load', (e, code, desc) => {
    console.log('[did-fail-load]', code, desc)
  })

  // Dev: load Vite dev server; Prod: load built index.html
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  db.initDb(app.getPath('userData'))
  createWindow()
})

// Storage & history core (Phase 1): every Yjs update/snapshot is written
// immediately by the main-process SQLite provider — the renderer never
// touches the filesystem directly.
ipcMain.handle('dyadic:getActiveNote', () => {
  const noteId = db.getOrCreateActiveNote()
  return { noteId, updates: db.loadUpdates(noteId) }
})

ipcMain.handle('dyadic:pushUpdate', (_event, noteId, update) => {
  db.appendUpdate(noteId, Buffer.from(update))
})

ipcMain.handle('dyadic:pushSnapshot', (_event, noteId, stateVector, snapshot) => {
  return db.appendSnapshot(noteId, Buffer.from(stateVector), Buffer.from(snapshot))
})

ipcMain.handle('dyadic:idleGC', (_event, noteId, mergedUpdate) => {
  db.compactNote(noteId, Buffer.from(mergedUpdate))
  db.vacuum()
})

// Phase 4 will change this to hide-to-tray; for now standard quit.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
