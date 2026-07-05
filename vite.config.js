// Vite config: React renderer + Tailwind v4 + Electron main/preload build.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Build Electron main + preload from the electron/ folder.
    // The `simple` API forces preload to build as CJS regardless of this
    // package's "type": "module" — Electron's sandboxed preload loader
    // can't execute ESM `import`.
    electron({
      main: { entry: 'electron/main.js' },
      preload: {
        input: 'electron/preload.js',
        onstart(args) { args.reload() }
      },
      renderer: {}
    })
  ]
})
