// Vite config: React renderer + Tailwind v4 + Electron main/preload build.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Build Electron main + preload from the electron/ folder
    electron([
      { entry: 'electron/main.js' },
      {
        entry: 'electron/preload.js',
        onstart(args) { args.reload() }
      }
    ]),
    renderer()
  ]
})
