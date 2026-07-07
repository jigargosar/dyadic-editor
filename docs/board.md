# Board
- AI should never use short names, of following sections, only infer them when user uses them.

## InBasket, Inbox (IB)
- [ ] Tray implementation (electron/main.js) is written but not manually
      verified: tray icon appears, close minimizes (not hides/quits),
      Show/Hide menu item toggles, Quit menu item fully exits, left-click
      toggles.
- [ ] electron/icon.png is a throwaway placeholder (83-byte solid-color
      square, generated via a Node script) — swap for a real icon later.

## Planning (PN)
-

## Ready (RY)
-

## In Progress (IP)
- [ ] Electron Tray; close minimizes to taskbar (not hide), explicit Quit exits. §4

## Done (DN)
- [x] Confirmed per-phase footnote pointers (main-spec-001.md footnotes 3-6,
      build-plan-001.md items 14-15) are already duplicated as inline code
      comments in useTabs.js/App.jsx/electron/main.js — safe to archive
      handoff.md/main-spec-001.md without losing this info.
- [x] Yjs Y.Doc + SQLite persistence, undo/redo, snapshots, idle GC. §1
- [x] CodeMirror 6 editor: content binding, undo/redo via Y.UndoManager, cursor persistence, Vim mode, read-only lock. §2
- [x] Tabs: drag-reorder, close-button width-freeze/reflow, full restart persistence. §3
- [x] Single-instance lock + shared toggle function (second-instance/global-shortcut parity). §4

---

# Dyadic Requirements

Status: `[x]` done · `[~]` partial · `[ ]` todo

## Phase 0 — Scaffold
- [x] Electron + React + Vite project; main/renderer/preload split with contextBridge.
- [x] Single BrowserWindow; app boots to an empty editor.

## Phase 1 — Storage & history core (critical)
- [x] Yjs Y.Doc per note; SQLite-backed persistence provider writing every update.
- [x] Continuous auto-save; exact restore of doc on relaunch.
- [x] Y.UndoManager for undo/redo; persist so it survives restart.
- [x] Y.snapshot version history; cadence on-pause + blur + N-minute ceiling; dedup by StateVector.
- [x] Idle-only GC + SQLite VACUUM.

## Phase 2 — Editor
- [x] CodeMirror 6 (minimalSetup) bound via y-codemirror.next (content + cursor restore).
- [x] Toggleable Vim mode (@replit/codemirror-vim).
- [x] Read-only lock with view-only styling.

## Phase 3 — Tabs
- [x] Tab model: unlimited, blank note (no templates), title = first line (live), "Untitled" when empty.
- [x] dnd-kit drag-reorder; per-tab close.
- [x] Close-button width-freeze — X stays under the cursor across repeated clicks, widths freeze after each close, reflow only on mouse-leave; overflow deferred.

## Phase 4 — Tray & quick open
- [~] Electron Tray; close minimizes to taskbar (not hide), explicit Quit exits. Implemented in electron/main.js (createTray, close-to-minimize, Show/Hide + Quit menu); placeholder icon (electron/icon.png), not yet manually tested.
- [~] Global shortcut (keyboard-first, prefer a Windows-key combo) — quick-open restores the last note exactly as it was; new-tab has a separate shortcut. Single-instance-lock + shared toggle function (second-instance/global-shortcut parity) done, driven via external launcher; exact accelerator, launcher script, and final toggle semantics still being finalized.

## Phase 5 — Closed-tab recovery
- [ ] Archive (reference, no action needed) + Revisit (remind-me) buckets; free movement between them.

## Phase 6 — Sections
- [ ] Section marker line (`---`/`§`) driving CodeMirror folding; collapse-to-preview.
- [ ] Per-block copy; per-block read-only lock.

## Phase 7 — Multi-clipboard
- [ ] Dedicated Clipboard tab; electron-clipboard-extended appends slots; toggle capture-into-current.
- [ ] Slots reorderable; "new note from selection".

## Phase 8 — Search
- [ ] MiniSearch global index across tabs + archive + revisit; everything searchable, fast frictionless switching matters more than box count.
- [ ] CodeMirror in-editor find.

## Before deploy v1
- [ ] Audit and strip dev-only debug tooling (CDP remote-debugging-port switch, electron-mcp-server test setup, any other dev-only diagnostics) so none of it ships in the packaged build.

## DX — Dev Experience
Won't fix till first launch.

- [ ] Guard TEMP DEBUG console logging (electron/main.js — renderer
      console-message/render-process-gone/did-fail-load handlers) behind a
      dev-only flag (e.g. `!app.isPackaged`, matching the CDP switch), rather
      than removing it.
- [ ] Finalize global-shortcut accelerator, external-launcher script, and
      toggle semantics. §4
- [ ] Restore/minimize toggle mechanics (`toggleMinMax`, tray click-to-toggle,
      second-instance handoff) — keep current bare-bones behavior, no
      polish now.

---

# Backlog

- [ ] Tab pinning.
- [ ] Tab-overflow UX — Chrome-style shrinking tabs + horizontal scroll fallback.
- [ ] Feature-usage tracking.
- [ ] Tips dialogue — IntelliJ-style prompt surfacing unused/underused features + usage counts.
- [ ] Compressed history display — coalesced timeline UI rendering meaningful snapshots; entries expandable/nameable, driven by snapshot-to-snapshot diffs.
- [ ] History scrubbing — timeline slider driving snapshot rendering to move through past states (nice-to-have, may be deferred without affecting the rest).

---

# Workflow

Everything below is a guideline, not a rigid rule — deviating from it is fine
using judgement, but any such judgement call should get explicit confirmation
before being acted on.

## What goes where
- **InBasket** — freshly noticed items, not yet triaged.
- **Planning** — items being actively scoped/thought through before work starts.
- **Ready** — scoped and queued, next up.
- **In Progress** — actively being worked on right now.
- **Done** — recently completed, kept as a live changelog.
- **Requirements** (by phase) — the canonical, locked record of what each phase contains and its status; items are never deleted once a phase is defined.
- **Backlog** — not-yet-committed / maybe items; promote into Planning when picked up.

## Ideal path
InBasket → Planning → Ready → In Progress → Done, with a duplicate, `§N`-tagged entry kept in sync in Requirements/Backlog.

## Progression/Evolution Cadence
Check `git log --follow -- docs/board.md` on the first request of each day.

---

## Open questions (workflow-only — product decisions have none, per the archived main-spec-001.md §5)
- None yet.
