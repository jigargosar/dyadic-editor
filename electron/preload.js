// Preload: safe bridge between renderer and main. Tray/shortcut APIs get
// exposed here in later phases.
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('dyadic', {
  version: '0.0.1',
  getActiveNote: () => ipcRenderer.invoke('dyadic:getActiveNote'),
  pushUpdate: (noteId, update) => ipcRenderer.invoke('dyadic:pushUpdate', noteId, update),
  pushSnapshot: (noteId, stateVector, snapshot) =>
    ipcRenderer.invoke('dyadic:pushSnapshot', noteId, stateVector, snapshot),
  idleGC: (noteId, mergedUpdate) => ipcRenderer.invoke('dyadic:idleGC', noteId, mergedUpdate)
})
