// Preload: safe bridge between renderer and main. Tray/shortcut APIs get
// exposed here in later phases.
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('dyadic', {
  version: '0.0.1',
  bootTabs: () => ipcRenderer.invoke('dyadic:bootTabs'),
  getNote: (noteId) => ipcRenderer.invoke('dyadic:getNote', noteId),
  createTab: (order) => ipcRenderer.invoke('dyadic:createTab', order),
  closeTab: (noteId) => ipcRenderer.invoke('dyadic:closeTab', noteId),
  reorderTab: (noteId, order) => ipcRenderer.invoke('dyadic:reorderTab', noteId, order),
  setActiveTab: (noteId) => ipcRenderer.invoke('dyadic:setActiveTab', noteId),
  pushUpdate: (noteId, update) => ipcRenderer.invoke('dyadic:pushUpdate', noteId, update),
  pushSnapshot: (noteId, stateVector, snapshot) =>
    ipcRenderer.invoke('dyadic:pushSnapshot', noteId, stateVector, snapshot),
  idleGC: (noteId, mergedUpdate) => ipcRenderer.invoke('dyadic:idleGC', noteId, mergedUpdate),
  pushCursor: (noteId, anchor, head) => ipcRenderer.invoke('dyadic:pushCursor', noteId, anchor, head)
})
