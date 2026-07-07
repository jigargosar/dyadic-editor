// Electron main process: creates a single BrowserWindow booting to the empty editor.
import { app, BrowserWindow, ipcMain, globalShortcut, screen, Tray, Menu } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as db from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Single-instance lock: a second launch attempt (e.g. an AHK script bound to
// Win+Space launching the app again, or an accidental second `electron .`)
// toggles the existing window instead of spawning a competing process
// (which previously fought over the CDP debug port and left stray processes
// behind).
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
  let tray = null
  let isQuitting = false

  // Shared toggle used by both the global shortcut and a relaunch attempt
  // (second-instance) — Windows reserves Win+Space for input-language
  // switching, so Electron can never register it directly; an AHK script
  // bound to Win+Space sends Super+Alt+Space instead, which this listens for.
  function toggleMinMax() {
    if (win.isMinimized()) {
      win.restore()
      win.show()
      win.focus()
    } else {
      win.minimize()
    }
  }

  function createWindow() {
    const width = 480
    const height = 640
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
    win = new BrowserWindow({
      width,
      height,
      x: screenWidth - width,
      y: Math.round((screenHeight - height) / 2),
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

    // Closing the window minimizes to taskbar instead of quitting — only the
    // tray's Quit item (isQuitting) fully exits.
    win.on('close', (e) => {
      if (isQuitting) return
      e.preventDefault()
      win.minimize()
    })
  }

  function createTray() {
    tray = new Tray(path.join(__dirname, 'icon.png'))
    tray.setToolTip('Dyadic')
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Show/Hide', click: toggleMinMax },
        {
          label: 'Quit',
          click: () => {
            isQuitting = true
            app.quit()
          },
        },
      ]),
    )
    tray.on('click', toggleMinMax)
  }

  // Fires in the existing (first) instance when a second launch attempt is
  // blocked by the lock above.
  app.on('second-instance', () => {
    if (!win) return
    toggleMinMax()
  })

  app.whenReady().then(() => {
    db.initDb(app.getPath('userData'))
    createWindow()
    createTray()
    globalShortcut.register('Super+Alt+Space', toggleMinMax)
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

// Fallback only — the close handler above minimizes instead of destroying
// the window, so this rarely fires from a normal close.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
