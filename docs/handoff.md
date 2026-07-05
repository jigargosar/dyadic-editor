# Handoff — Dyadic Editor

## Current state (Phase 1 storage core complete)
1. Electron + React + Vite scaffold boots to the empty editor.
2. Yjs Y.Doc per note persisted through SQLite (`node:sqlite`, no native rebuild step); every keystroke auto-saves via IPC; content survives app restart.
3. Snapshots captured on idle (2s) / blur / 5-min ceiling, deduped by state vector; idle-only GC compacts the update log + SQLite VACUUM.
4. Undo/redo wired via `Y.UndoManager` to Ctrl+Z/Ctrl+Y, and **survives restart** (fixed in `d338321`). Implementation facts and mechanism: `docs/main-spec-001.md` §"Storage & History — Resolution (002)", item 6, footnote 3.
5. Committed locally: `de1b72b`, `c45739e`, `d338321`. No git remote configured yet, so nothing is pushed.

## Chosen stack (not yet installed — Phase 2+)
1. Editor: **CodeMirror 6** via `y-codemirror.next`; Vim via `@replit/codemirror-vim`.
2. Tabs: **dnd-kit**. Search: **MiniSearch**. Multi-clipboard: Electron `clipboard` + `electron-clipboard-extended`.
3. Tray + global shortcut: Electron `Tray` + `globalShortcut`.

## Dev tooling — AI-driven testing
1. Currently registered: `electron` MCP server → `@laststance/electron-mcp-server@latest` (2.0.1 as of this writing).
2. Full setup, tool gotchas, and package warnings: `docs/ai-testing-001.md`.

## Layout
1. `electron/main.js` — single BrowserWindow (still standard quit; Phase 4 switches to hide-to-tray); dev-only CDP switch; wires `dyadic:*` IPC handlers to `db.js`.
2. `electron/preload.js` — contextBridge bridge (`window.dyadic`): getActiveNote/pushUpdate/pushSnapshot/idleGC.
3. `electron/db.js` — `node:sqlite` persistence: notes/updates/snapshots/app_state tables, snapshot dedup, idle compaction + VACUUM.
4. `src/App.jsx` — Phase 0 textarea, now backed by `src/store/useYNote.js` (CodeMirror replaces the textarea in Phase 2).
5. `src/store/useYNote.js` — binds a Y.Doc to the textarea; replays persisted updates through an already-attached `Y.UndoManager` on boot; drives snapshot/idle-GC cadence; exposes undo/redo.

## Next step
1. Phase 1 is functionally complete and verified (storage, undo/redo, snapshots, idle GC). Start Phase 2 per `docs/build-plan-001.md` items 8-10:
   - Replace the plain `<textarea>` in `src/App.jsx` with **CodeMirror 6** (`minimalSetup`), bound to the existing `Y.Doc` via `y-codemirror.next` — must preserve both content restore and cursor/selection restore (relative positions) on reload, not just content.
   - Add toggleable **Vim mode** via `@replit/codemirror-vim` (add/remove the `vim()` extension).
   - Add a **read-only lock** (`EditorState.readOnly` / `EditorView.editable.of(false)`) with view-only styling (dimmed background, lock icon, no caret) per `ux-notes-001.md` item 20.
   - None of these packages are installed yet — `pnpm add` them first.
2. Git remote is still unconfigured — set one up when ready to push.

## Notes
1. All open questions are resolved (see spec §5 + §"Resolved"). Section marker: `---`/`§`. Global shortcut: Win+Space (AHK). GC: idle-only.
2. Backlog: tab pinning, tab-overflow UX, feature-usage tracking, tips dialogue.
