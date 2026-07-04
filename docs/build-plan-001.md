# Build Plan (001)

Phased implementation order for Dyadic. Storage/history first — zero data loss is the north star. Each phase is shippable before the next.

## Phase 0 — Scaffold
1. Electron + React + Vite project; main/renderer/preload split with contextBridge.
2. Single BrowserWindow; app boots to an empty editor.

## Phase 1 — Storage & history core (critical)
3. Yjs Y.Doc per note; SQLite-backed persistence provider writing every update.
4. Continuous auto-save; exact restore of doc on relaunch.
5. Y.UndoManager for undo/redo; persist so it survives restart.
6. Y.snapshot version history; cadence on-pause + blur + N-minute ceiling; dedup by StateVector.
7. Idle-only GC + SQLite VACUUM.

## Phase 2 — Editor
8. CodeMirror 6 (minimalSetup) bound via y-codemirror.next (content + cursor restore).
9. Toggleable Vim mode (@replit/codemirror-vim).
10. Read-only lock with view-only styling.

## Phase 3 — Tabs
11. Tab model: unlimited, title = first line (live), "Untitled" when empty.
12. dnd-kit drag-reorder; per-tab close.
13. Close-button width-freeze (reflow on mouse-leave); overflow deferred.

## Phase 4 — Tray & quick open
14. Electron Tray; close hides to tray, explicit Quit exits.
15. Global shortcut (Win+Space) restores last note; separate shortcut for new tab.

## Phase 5 — Closed-tab recovery
16. Archive + revisit buckets; free movement between them.

## Phase 6 — Sections
17. Section marker line (`---`/`§`) driving CodeMirror folding; collapse-to-preview.
18. Per-block copy; per-block read-only lock.

## Phase 7 — Multi-clipboard
19. Dedicated Clipboard tab; electron-clipboard-extended appends slots; toggle capture-into-current.
20. Slots reorderable; "new note from selection".

## Phase 8 — Search
21. MiniSearch global index across tabs + archive + revisit; fast section switching.
22. CodeMirror in-editor find.

## Backlog
23. Tab pinning; tab-overflow UX; feature-usage tracking; tips dialogue.
