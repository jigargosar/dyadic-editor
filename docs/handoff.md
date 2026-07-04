# Handoff — Dyadic Editor

Working name: **Dyadic**. Tab-based plain-text desktop editor. Zero data loss is the north star.

## Current state (Phase 0 complete)
1. Scaffold built and verified: Electron + React + Vite, main/renderer/preload split, single window boots to an empty editor.
2. Dependencies installed via **pnpm** (not npm — npm artifacts removed).
3. `pnpm build` compiles clean (renderer + `dist-electron/main.js` + `preload.js`).
4. Electron launch attempted; window-boot verification was the last step in progress.

## Stack (installed)
1. react 19.2.7, react-dom 19.2.7
2. vite 8.1.3, @vitejs/plugin-react 6.0.3
3. electron 43.0.0, vite-plugin-electron 1.1.0, vite-plugin-electron-renderer 1.0.0
4. tailwindcss 4.3.2, @tailwindcss/vite 4.3.2 (Tailwind v4: single `@import "tailwindcss";` in `src/index.css`, plugin in `vite.config.js`)

## Chosen stack (not yet installed — Phase 1+)
1. Storage/history core: **Yjs** (CRDT) + SQLite-backed persistence provider + editor binding.
2. Editor: **CodeMirror 6** via `y-codemirror.next`; Vim via `@replit/codemirror-vim`.
3. Tabs: **dnd-kit**. Search: **MiniSearch**. Multi-clipboard: Electron `clipboard` + `electron-clipboard-extended`.
4. Tray + global shortcut: Electron `Tray` + `globalShortcut`.

## Run
1. `cd C:\Users\jigar\projects\dyadic-editor`
2. `pnpm install` (if node_modules missing)
3. `pnpm build` then `pnpm exec electron .` — should open a dark full-bleed editor with a "Start typing." placeholder.

## Layout
1. `electron/main.js` — single BrowserWindow (still standard quit; Phase 4 switches to hide-to-tray).
2. `electron/preload.js` — contextBridge stub (`window.dyadic`).
3. `src/App.jsx` — Phase 0 textarea placeholder (CodeMirror replaces it in Phase 2).
4. `docs/` — full spec, build plan, UX notes, this handoff.

## Next step
1. Verify the Electron window boots to the empty editor (last pending check).
2. Then begin **Phase 1 — Storage & history core**: Yjs Y.Doc per note + SQLite persistence writing every update, exact restore on relaunch.
3. Read `docs/build-plan-001.md` for the full phased order and `docs/main-spec-001.md` for locked decisions.

## Notes
1. All open questions are resolved (see spec §5 + §"Resolved"). Section marker: `---`/`§`. Global shortcut: Win+Space (AHK). GC: idle-only.
2. Backlog: tab pinning, tab-overflow UX, feature-usage tracking, tips dialogue.
