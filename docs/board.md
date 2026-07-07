# Board
- AI should never use short names, of following sections, only infer them when user uses them.

## InBasket, Inbox (IB)
- [ ] Footnote pointers per phase need a home before archiving handoff.md's
      Current-state section: Phase 1 → main-spec-001.md
      §"Storage & History — Resolution (002)"; Phase 2 → main-spec-001.md
      item 4 footnote 4 (cursor persistence + useCallback gotcha) and
      footnote 5 (read-only lock + focus/keymap gotcha); Phase 3 →
      main-spec-001.md footnote 6; Phase 4 → build-plan-001.md items 14-15,
      requestSingleInstanceLock() + CDP-port-conflict rationale.
- [ ] Dev tooling fact needs a home before archiving handoff.md: currently
      registered MCP server → @laststance/electron-mcp-server@latest
      (2.0.1 as of last check); full setup/gotchas live in ai-testing-001.md.
- [ ] Layout section needs a home before archiving handoff.md: 6-line
      file-by-file architecture map (electron/main.js, preload.js, db.js,
      App.jsx, useTabs.js, TabBar.jsx).

## Planning (PN)
- [ ] Electron Tray; close hides to tray, explicit Quit exits. §4
- [ ] Finalize global-shortcut accelerator, external-launcher script, and toggle semantics. §4

## Ready (RY)
-

## In Progress (IP)
-

## Done (DN)
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
- [x] Tab model: unlimited, title = first line (live), "Untitled" when empty.
- [x] dnd-kit drag-reorder; per-tab close.
- [x] Close-button width-freeze (reflow on mouse-leave); overflow deferred.

## Phase 4 — Tray & quick open
- [ ] Electron Tray; close hides to tray, explicit Quit exits. Not started — close still quits normally.
- [~] Global shortcut restores last note; separate shortcut for new tab. Single-instance-lock + shared toggle function (second-instance / global-shortcut parity) done, driven via external launcher; exact accelerator, launcher script, and final toggle semantics still being finalized.

## Phase 5 — Closed-tab recovery
- [ ] Archive + revisit buckets; free movement between them.

## Phase 6 — Sections
- [ ] Section marker line (`---`/`§`) driving CodeMirror folding; collapse-to-preview.
- [ ] Per-block copy; per-block read-only lock.

## Phase 7 — Multi-clipboard
- [ ] Dedicated Clipboard tab; electron-clipboard-extended appends slots; toggle capture-into-current.
- [ ] Slots reorderable; "new note from selection".

## Phase 8 — Search
- [ ] MiniSearch global index across tabs + archive + revisit; fast section switching.
- [ ] CodeMirror in-editor find.

## Before deploy v1
- [ ] Audit and strip dev-only debug tooling (CDP remote-debugging-port switch, electron-mcp-server test setup, any other dev-only diagnostics) so none of it ships in the packaged build.

---

# Backlog

- [ ] Tab pinning.
- [ ] Tab-overflow UX — Chrome-style shrinking tabs + horizontal scroll fallback.
- [ ] Feature-usage tracking.
- [ ] Tips dialogue — IntelliJ-style prompt surfacing unused/underused features + usage counts.

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

## Open questions (workflow-only — product open questions live in `main-spec-001.md` §5)
- None yet.
