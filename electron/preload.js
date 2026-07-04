// Preload: safe bridge between renderer and main. Empty surface for now;
// storage/tray/shortcut APIs get exposed here in later phases.
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('dyadic', {
  version: '0.0.1'
})
