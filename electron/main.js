// Electron main process: creates a single BrowserWindow booting to the empty editor.
import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as db from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Single-instance lock: a second launch attempt (e.g. double-firing a global
// shortcut, or an accidental second `electron .`) just focuses the existing
// window instead of spawning a competing process (which previously fought
// over the CDP debug port and left stray processes behind).
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  // A second launch attempt loses the race: quit before anything else in
  // this file runs. app.quit() doesn't halt script execution by itself, so
  // everything else below must live in the `else` branch — otherwise this
  // instance would still call whenReady().then(...) and briefly open its
  // own window/DB connection before the quit takes effect.
  app.quit()
} else {
  // Dev-only CDP access for AI/agent-driven testing (electron-mcp-server, Playwright).
  // Never opens in a packaged build.
  if (!app.isPackaged) {
    app.commandLine.appendSwitch('remote-debugging-port', '9222')
  }

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

  // Fires in the existing (first) instance when a second launch attempt is
  // blocked by the lock above.
  app.on('second-instance', () => {
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  })

  app.whenReady().then(() => {
    db.initDb(app.getPath('userData'))
    createWindow()

    // TEMP PROBE (Phase 4): try a few quick-open shortcut candidates and log
    // which ones the OS actually grants. Registration succeeding (true) isn't
    // proof it will fire on keypress — e.g. Windows reserves Super+Space for
    // input-language switching and may intercept it before Electron sees it —
    // so these stay live (not unregistered) for a manual press-and-watch check.
    const candidates = ['Super+Space', 'Super+Alt+Space', 'Control+Alt+Space']
    for (const accelerator of candidates) {
      const ok = globalShortcut.register(accelerator, () => {
        console.log(`[shortcut-probe] fired: ${accelerator}`)
      })
      console.log(`[shortcut-probe] register("${accelerator}") ->`, ok)
    }
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
}

// Storage & history core (Phase 1): every Yjs update/snapshot is written
// immediately by the main-process SQLite provider — the renderer never
// touches the filesystem directly.
ipcMain.handle('dyadic:bootTabs', () => db.bootTabs())

ipcMain.handle('dyadic:getNote', (_event, noteId) => db.getNote(noteId))

ipcMain.handle('dyadic:createTab', (_event, order) => db.createTab(order))

ipcMain.handle('dyadic:closeTab', (_event, noteId) => db.closeTab(noteId))

ipcMain.handle('dyadic:reorderTab', (_event, noteId, order) => db.setTabOrder(noteId, order))

ipcMain.handle('dyadic:setActiveTab', (_event, noteId) => db.setActiveTab(noteId))

ipcMain.handle('dyadic:pushCursor', (_event, noteId, anchor, head) => {
  db.setCursor(noteId, anchor, head)
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
