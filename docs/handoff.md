# Handoff — Dyadic Editor

## Current state (Phase 3 complete)
1. Phase 1 (storage core) complete: Yjs + SQLite persistence, undo/redo, snapshots, idle GC all verified — see `main-spec-001.md` §"Storage & History — Resolution (002)".
2. Phase 2 complete: `src/App.jsx` runs **CodeMirror 6** bound to the Yjs doc via `y-codemirror.next`, replacing the Phase 0/1 textarea. Done: content binding, undo/redo (routed through the same `Y.UndoManager`, not CodeMirror's own `history()`), cursor/selection persistence across restart, toggleable **Vim mode** (Ctrl+;), toggleable **read-only lock** (Ctrl+L). Implementation facts: `main-spec-001.md` item 4 footnote 4 (cursor persistence + a `useCallback` gotcha) and footnote 5 (read-only lock + a focus/keymap gotcha) — both worth reading before touching `App.jsx` again.
3. Phase 3 complete: tabs (build-plan-001.md items 11-13). `src/store/useTabs.js` keeps a live Yjs binding per open tab, not just the active one, so tab titles (live first line) stay current in the background; `src/components/TabBar.jsx` adds drag-reorder via `@dnd-kit/react` + `@dnd-kit/dom` (not `@dnd-kit/core`/`sortable`/`modifiers`) with order as a `fractional-indexing` string, plus Chrome-style close-button width-freeze/reflow-on-mouse-leave. Ctrl+T/Ctrl+W/Ctrl+Tab/Ctrl+Shift+Tab all wired and verified, including full restart persistence (tab list, order, content, active tab, cursor). Implementation facts: `main-spec-001.md` footnote 6.
4. Committed locally: `de1b72b`, `c45739e`, `d338321`, `660d7b7`, `1a1409d`, `9bb96d4`, `5f88a48`, `eb06b15`. No git remote configured yet, so nothing is pushed.

## Dev tooling — AI-driven testing
1. Currently registered: `electron` MCP server → `@laststance/electron-mcp-server@latest` (2.0.1 as of this writing).
2. Full setup, tool gotchas, and package warnings: `docs/ai-testing-001.md`.
3. Killing stray dev Electron instances: match by exact executable path, not process name (see `CLAUDE.md` Commands section) — a single `electron .` launch spawns several OS processes (main + renderer + GPU + utility) sharing that same path, and name-based matching would risk touching unrelated Electron apps (VS Code, Slack, etc.).

## Layout
1. `electron/main.js` — single BrowserWindow (still standard quit; Phase 4 switches to hide-to-tray); dev-only CDP switch; wires `dyadic:*` IPC handlers to `db.js`.
2. `electron/preload.js` — contextBridge bridge (`window.dyadic`): bootTabs/getNote/createTab/closeTab/reorderTab/setActiveTab/pushUpdate/pushSnapshot/idleGC/pushCursor.
3. `electron/db.js` — `node:sqlite` persistence: notes (+ `order` fractional-index and `is_open` columns)/updates/snapshots/app_state tables, snapshot dedup, idle compaction + VACUUM, per-note cursor storage.
4. `src/App.jsx` — CodeMirror 6 editor view bound to the active tab: yCollab binding, Vim-mode toggle, read-only toggle, cursor restore/persist, tab keyboard shortcuts.
5. `src/store/useTabs.js` — one live Yjs binding per open tab; replays persisted updates through an already-attached `Y.UndoManager` on boot; drives snapshot/idle-GC/cursor-save cadence for the active tab; exposes the tab list, active tab id, switch/create/close/reorder actions, plus the active tab's `ytext`/`undoManager`/`awareness`/`initialCursor`/`undo`/`redo`/`saveCursor`.
6. `src/components/TabBar.jsx` — tab strip: drag-reorder, close-button width-freeze/reflow, new-tab button.

## Next step
1. **Phase 4 — Tray & quick open** (build-plan-001.md items 14-15): Electron Tray with close-hides-to-tray, Win+Space global shortcut restores last note, separate shortcut for new tab.
2. Git remote is still unconfigured — set one up when ready to push.

## Notes
1. All open questions are resolved (see `main-spec-001.md` §5 + §"Resolved"). Section marker: `---`/`§`. Global shortcut: Win+Space (AHK). GC: idle-only.
2. Backlog: tab pinning, tab-overflow UX, feature-usage tracking, tips dialogue.
3. Known limitation: Vim mode / read-only lock toggle state lives at the App level, not per-tab, so switching tabs carries over whatever lock/vim state was active. Not addressed in Phase 3 — revisit if it becomes a real pain point.
