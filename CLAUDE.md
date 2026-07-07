# CLAUDE.md

@docs/board.md — read last section (Workflow)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Dyadic — tab-based plain-text desktop editor (Electron + React + Vite). Zero data loss is the north star: no typed character is ever lost, and every tab restores exactly on relaunch.

## Stack

- Package manager: **pnpm only** — no npm/yarn lockfiles or artifacts.
- Vite 8 + `@vitejs/plugin-react`; Electron 43 via `vite-plugin-electron` (main/preload built from `electron/main.js`, `electron/preload.js`; renderer/main/preload share one `vite.config.js`). The `simple` API forces the preload build to CJS regardless of the package's ESM `"type": "module"` — Electron's sandboxed preload loader can't execute ESM `import`.
- Tailwind v4 via `@tailwindcss/vite` — single `@import "tailwindcss";` in `src/index.css`, no `tailwind.config.js`.
- Plain JavaScript (`.jsx`), not TypeScript.
- Yjs (CRDT core) + `node:sqlite` persistence for the storage/undo-history layer (Phase 1) — see `src/store/useTabs.js` and `electron/db.js` for implementation detail.

## Commands

- `pnpm install` — install dependencies
- `pnpm build` — compiles renderer + `dist-electron/main.js` + `preload.js`
- `pnpm exec electron .` — launch the built app
- `pnpm dev` — Vite dev server; `vite-plugin-electron` auto-launches Electron and hot-restarts the main process on `electron/*.js` changes, with renderer HMR and preload reload — no manual build/relaunch needed during dev
- `pnpm kill` — kills stray dev Electron instances (`scripts/kill-electron.js`), matched by exact command line (`<electron.exe> .`, resolved via `import electron from 'electron'`) rather than just executable path — a process sharing the path but invoked differently (different args, or none running at all) is left untouched rather than guessed at. Exit codes are deliberate: nothing found → `0` (safe for a chained command to continue), found but a kill failed → `1` (chain should stop). Known gap: this only covers the production `pnpm exec electron .` flow — `pnpm dev` instances (via `vite-plugin-electron`) launch with extra args (`. --no-sandbox`), so their command line never matches and this script can't clean them up.

## Architecture

- `electron/main.js` — single-instance-locked BrowserWindow (still standard quit; Phase 4 switches to hide-to-tray); dev-only CDP switch; wires `dyadic:*` IPC handlers to `db.js`.
- `electron/preload.js` — contextBridge bridge (`window.dyadic`): bootTabs/getNote/createTab/closeTab/reorderTab/setActiveTab/pushUpdate/pushSnapshot/idleGC/pushCursor.
- `electron/db.js` — `node:sqlite` persistence: notes (+ `order` fractional-index and `is_open` columns)/updates/snapshots/app_state tables, snapshot dedup, idle compaction + VACUUM, per-note cursor storage.
- `src/App.jsx` — CodeMirror 6 editor view bound to the active tab: yCollab binding, Vim-mode toggle, read-only toggle, cursor restore/persist, tab keyboard shortcuts.
- `src/store/useTabs.js` — one live Yjs binding per open tab; replays persisted updates through an already-attached `Y.UndoManager` on boot; drives snapshot/idle-GC/cursor-save cadence for the active tab; exposes the tab list, active tab id, switch/create/close/reorder actions, plus the active tab's `ytext`/`undoManager`/`awareness`/`initialCursor`/`undo`/`redo`/`saveCursor`.
- `src/components/TabBar.jsx` — tab strip: drag-reorder, close-button width-freeze/reflow, new-tab button.

## Docs

- @docs/ux-notes-001.md — keyboard map and UX flows
- @docs/ai-testing-001.md — driving the running app from Claude Code (MCP setup, tool gotchas, package warnings)
