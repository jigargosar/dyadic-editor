# Handoff — Dyadic Editor

## Current state (Phase 2 complete)
1. Phase 1 (storage core) complete: Yjs + SQLite persistence, undo/redo, snapshots, idle GC all verified — see `main-spec-001.md` §"Storage & History — Resolution (002)".
2. Phase 2 complete: `src/App.jsx` runs **CodeMirror 6** bound to the Yjs doc via `y-codemirror.next`, replacing the Phase 0/1 textarea. Done: content binding, undo/redo (routed through the same `Y.UndoManager`, not CodeMirror's own `history()`), cursor/selection persistence across restart, toggleable **Vim mode** (Ctrl+;), toggleable **read-only lock** (Ctrl+L). Implementation facts: `main-spec-001.md` item 4 footnote 4 (cursor persistence + a `useCallback` gotcha) and footnote 5 (read-only lock + a focus/keymap gotcha) — both worth reading before touching `App.jsx`/`useYNote.js` again.
3. Phase 3 (Tabs, build-plan-001.md items 11-13) is next: tab model (unlimited, title = live first line, "Untitled" default), dnd-kit drag-reorder, close-button width-freeze behavior. None of dnd-kit/MiniSearch/clipboard-extended are installed yet.
4. Committed locally: `de1b72b`, `c45739e`, `d338321`, `660d7b7`, `1a1409d`, `9bb96d4`, `5f88a48`. No git remote configured yet, so nothing is pushed.

## Dev tooling — AI-driven testing
1. Currently registered: `electron` MCP server → `@laststance/electron-mcp-server@latest` (2.0.1 as of this writing).
2. Full setup, tool gotchas, and package warnings: `docs/ai-testing-001.md`.

## Layout
1. `electron/main.js` — single BrowserWindow (still standard quit; Phase 4 switches to hide-to-tray); dev-only CDP switch; wires `dyadic:*` IPC handlers to `db.js`.
2. `electron/preload.js` — contextBridge bridge (`window.dyadic`): getActiveNote/pushUpdate/pushSnapshot/idleGC/pushCursor.
3. `electron/db.js` — `node:sqlite` persistence: notes/updates/snapshots/app_state tables, snapshot dedup, idle compaction + VACUUM, per-note cursor storage.
4. `src/App.jsx` — CodeMirror 6 editor view: yCollab binding, Vim-mode toggle, read-only toggle, cursor restore/persist.
5. `src/store/useYNote.js` — binds a Y.Doc to the note; replays persisted updates through an already-attached `Y.UndoManager` on boot; drives snapshot/idle-GC/cursor-save cadence; exposes `ytext`/`undoManager`/`awareness`/`initialCursor`/`undo`/`redo`/`saveCursor`.

## Next step
1. **Phase 3 — Tabs** (build-plan-001.md items 11-13): tab model (unlimited, title = live first line, "Untitled" default), dnd-kit drag-reorder, close-button width-freeze behavior. None of dnd-kit/MiniSearch/clipboard-extended are installed yet.
2. Git remote is still unconfigured — set one up when ready to push.

## Notes
1. All open questions are resolved (see `main-spec-001.md` §5 + §"Resolved"). Section marker: `---`/`§`. Global shortcut: Win+Space (AHK). GC: idle-only.
2. Backlog: tab pinning, tab-overflow UX, feature-usage tracking, tips dialogue.
