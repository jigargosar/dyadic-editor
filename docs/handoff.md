# Handoff — Dyadic Editor

Working name: **Dyadic**. Tab-based plain-text desktop editor. Zero data loss is the north star.

## Current state (Phase 0 verified, Phase 1 storage core implemented)
1. Phase 0 scaffold verified: Electron + React + Vite, main/renderer/preload split, window boots to the empty editor (confirmed via manual + automated launch).
2. Phase 1 storage core implemented: Yjs Y.Doc per note persisted through SQLite (`node:sqlite`, no native rebuild step); every keystroke auto-saves via IPC; confirmed content survives app restart.
3. Snapshots captured on idle (2s) / blur / 5-min ceiling, deduped by state vector; idle-only GC compacts the update log + SQLite VACUUM.
4. Undo/redo wired via `Y.UndoManager` to Ctrl+Z/Ctrl+Y — works within a session only (see Known issues).
5. Committed locally as `de1b72b`; no git remote configured yet, so nothing is pushed.

## Known issues
1. **Undo/redo does not survive restart.** `src/store/useYNote.js` creates a fresh `Y.UndoManager` on every mount, so its undo stack is always empty after relaunch — confirmed with an automated CDP test (typed a marker, quit, relaunched, Ctrl+Z was a no-op). Fixing this is next up; `build-plan-001.md` item 5 calls for persistence here.

## Stack (installed)
1. react 19.2.7, react-dom 19.2.7
2. vite 8.1.3, @vitejs/plugin-react 6.0.3
3. electron 43.0.0, vite-plugin-electron 1.1.0 (using the `simple` API — preload forced to CJS build regardless of the package's ESM `type`)
4. tailwindcss 4.3.2, @tailwindcss/vite 4.3.2 (Tailwind v4: single `@import "tailwindcss";` in `src/index.css`, plugin in `vite.config.js`)
5. yjs 13.6.31 (CRDT core for Phase 1 storage)

## Chosen stack (not yet installed — Phase 2+)
1. Editor: **CodeMirror 6** via `y-codemirror.next`; Vim via `@replit/codemirror-vim`.
2. Tabs: **dnd-kit**. Search: **MiniSearch**. Multi-clipboard: Electron `clipboard` + `electron-clipboard-extended`.
3. Tray + global shortcut: Electron `Tray` + `globalShortcut`.

## Run
1. `cd C:\Users\jigar\projects\dyadic-editor`
2. `pnpm install` (if node_modules missing)
3. `pnpm build` then `pnpm exec electron .` — opens a dark full-bleed editor; type, close, relaunch to confirm content persists exactly.

## Dev tooling — AI-driven testing
1. `electron/main.js` opens CDP on port 9222 in dev (`--remote-debugging-port`, gated on `!app.isPackaged` — never active in a packaged build).
2. `electron-mcp-server` is registered as a local-scope MCP server (`claude mcp add electron ...`) — machine-local config in `~/.claude.json`, not checked into the repo. Requires a `SCREENSHOT_ENCRYPTION_KEY` env var (32-byte hex, e.g. `openssl rand -hex 32`).
3. Once connected, tools like `mcp__electron__take_screenshot` / `send_command_to_electron` can drive the running app directly (click, type, keyboard shortcuts, eval) without a human at the keyboard — this is how the undo/restart bug above was confirmed.
4. The app must already be running (`pnpm exec electron .`) — this MCP server attaches via CDP, it doesn't launch/quit the app itself.
5. Claude Code's own built-in "computer-use" feature was investigated as an alternative but is CLI-only on macOS — not usable from a Windows session, which is why electron-mcp-server is the current path.

## Layout
1. `electron/main.js` — single BrowserWindow (still standard quit; Phase 4 switches to hide-to-tray); dev-only CDP switch; wires `dyadic:*` IPC handlers to `db.js`.
2. `electron/preload.js` — contextBridge bridge (`window.dyadic`): getActiveNote/pushUpdate/pushSnapshot/idleGC.
3. `electron/db.js` — `node:sqlite` persistence: notes/updates/snapshots/app_state tables, snapshot dedup, idle compaction + VACUUM.
4. `src/App.jsx` — Phase 0 textarea, now backed by `src/store/useYNote.js` (CodeMirror replaces the textarea in Phase 2).
5. `src/store/useYNote.js` — binds a Y.Doc to the textarea; replays persisted updates on boot; drives snapshot/idle-GC cadence; exposes undo/redo.
6. `docs/` — full spec, build plan, UX notes, this handoff.

## Next step
1. Fix the undo/redo-survives-restart bug (see Known issues) — likely needs the undo stack (or enough context to rebuild one) persisted alongside the Yjs updates.
2. Then continue the Phase 1 remainder / start Phase 2 per `docs/build-plan-001.md`.
3. Git remote is still unconfigured — set one up when ready to push.

## Notes
1. All open questions are resolved (see spec §5 + §"Resolved"). Section marker: `---`/`§`. Global shortcut: Win+Space (AHK). GC: idle-only.
2. Backlog: tab pinning, tab-overflow UX, feature-usage tracking, tips dialogue.
