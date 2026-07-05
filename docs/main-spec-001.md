# Tab-Based Text Editor — Spec (v0)

Working name: **Dyadic** (placeholder). Zero data loss is the north star.

---

## 1. Locked Decisions

### Platform & Stack
1. Desktop app, **Electron** base.
2. Windows-first (global shortcut assumptions target Windows).

### Storage & Data Safety
1. Storage location/format is flexible — the only rule is **consistency**.
2. **No typed character is ever lost** — continuous auto-save as you type.
3. On reopen, restore **every tab exactly and precisely** as left (open tabs, content, cursor position).

### App Lifecycle & Tray
1. App stays **resident** for speed; never unloads unless explicitly exited.
2. **Tray icon** required.
3. Clicking tray icon toggles show/hide of the window.
4. Closing the window **hides to tray** (does not quit).
5. Only an explicit "Quit" action fully exits.

### Tabs
1. **Unlimited** tabs.
2. Each tab is a blank note (no templates).
3. Tab **title = first line** of the note, updating **live** as the first line changes.
4. Empty first line → tab shows **"Untitled"** (default; not important).
5. Tabs reorderable by drag.
6. Each tab individually closable via its own X button.

### Close-Button Width Freeze (tricky — Chrome behavior)
1. When closing tabs by repeated mouse clicks, the **X stays under the cursor** — its screen position must not move between clicks.
2. Tab widths **freeze after a close** so each successive X lands under the stationary cursor (rapid close in one spot).
3. Reflow to full/even widths happens **on mouse-leave** from the tab strip, not during the close sequence.

### Closed-Tab Recovery
1. Closed tabs are **never truly lost** — recoverable.
2. Two buckets:
   1. **Archive** — reference, no action needed.
   2. **Revisit / Remind-me** — things to come back to.
3. Notes flow **freely** between the two (archive ↔ revisit).

### Search
1. **Everything** is searchable — active tabs, archive, and revisit.
2. **Global search** with fast, frictionless switching across sections (box count doesn't matter; easy switching does).

### Keyboard & Quick Open
1. **Keyboard-first** design throughout.
2. **Global shortcut** to summon the app from anywhere — prefer a Windows-key combo over a link-assigned shortcut.
3. **Quick open** = single behavior: restores the **last note exactly as it was**.
4. A **separate shortcut** creates a new tab.

### Read-Only (high priority, independent of sections)
1. Ability to lock a note (and/or block) into **view-only / read-only** mode to prevent accidental edits.

---

## 2. Experimental Features (needed, keep simple)

### Sections (collapsible blocks within a note)
1. A note can hold predefined **sections** / blocks.
2. **One-click copy** of a single block's text.
3. Blocks **collapse** to a 2–3 line preview for whole-picture overview of long notes.
4. Optional **read-only lock** per block.
5. Ability to **organize/reorder** sections.
6. Open question: what defines a section boundary (blank lines / manual marker / explicit "new section") — TBD.

### Multi-Clipboard (needed, important)
1. Sequential copies (A, then B, then C) each captured into a **separate slot/section**, avoiding the manual "temp variable" shuffle.
2. **Dedicated Clipboard tab** by default — every copy appends a new slot; predictable, never disrupts the active note.
3. **Toggle**: option to "capture into current/frontmost tab" instead.
4. Clips are treated like note sections — **select some → "create new note from selection"** to organize/edit them normally.
5. **Clipboard history is never lost** — the Clipboard tab retains all clips regardless of what's pulled out.
6. Design principle: **stay simple**; roundabout-but-reliable beats clever-but-fragile. Add/tweak later.

---

## 3. Backlog (not v1)

1. **Tab pinning** — good idea, no felt need yet.
2. **Tab overflow UX** — Chrome-style shrinking tabs + horizontal scroll fallback; decide when we hit the limit.
3. **Vim mode** — easy toggle on/off; depth of functionality undecided.
4. **Feature-usage tracking** — record which features get used most.
5. **Tips dialogue** — IntelliJ-style prompt surfacing unused/underused features + usage counts.

---

## 4. Resolved

1. Clipboard capture target — dedicated Clipboard tab by default, with a toggle to capture-into-current.
2. Section boundary — explicit marker line (`---` or `§`), typed or inserted via command; drives folding.
3. Global shortcut — Win+Space (via AHK or similar); exact key not fixed here.

## 5. Open Questions

None.

---

# Storage & History — Resolution (002)

The settled approach for each critical concern. Stack: **Yjs** (CRDT core) + a persistence provider + an editor binding. Each line is tagged by what delivers it.

1. **Zero data loss** — *[Provider]* Every edit is a Yjs update written immediately by the persistence provider; the document is durable and offline-safe.
2. **Consistent storage** — *[Provider]* One SQLite-backed persistence provider owns all writes.
3. **Continuous auto-save** — *[Provider]* The provider writes on every update; there is no explicit save action.
4. **Exact tab-state restore (content + cursor)** — *[Editor binding + We build]* Content restores from the persisted doc; cursor/selection restores via a plain absolute offset persisted per note, not a Yjs relative position.[^4]
5. **Closed-tab recovery → archive + revisit** — *[We build]* Each note's Y.Doc is retained on close; its id moves between two lists (archive, revisit) in app storage.
6. **Persistent undo/redo** — *[Yjs core]* `Y.UndoManager` handles undo/redo (merge window tunable); the persisted doc lets history survive restart.[^3]
7. **Snapshot / version history** — *[Yjs core]* `Y.snapshot` captures point-in-time state as a lightweight StateVector + DeleteSet, stored per note. Cadence: on-pause (idle gap) + blur + N-minute ceiling.
8. **No redo data loss** — *[Yjs core]* Snapshots are immutable reference points; restoring one never destroys any other state.
9. **Snapshot dedup** — *[Yjs core + We build]* A new snapshot is skipped when its StateVector equals the previous one.
10. **Storage growth / compaction** — *[Yjs core + We build]* Periodic GC/compaction folds tombstones; older op-log is collapsed into the latest snapshot as the base. GC runs idle-only, never mid-edit; SQLite VACUUM during idle reclaims disk.[^1]
11. **Compressed history display** — *[We build]* A coalesced timeline UI renders meaningful snapshots; entries are expandable and nameable, driven by snapshot-to-snapshot diffs.
12. **Fast history querying** — *[Yjs core + We build]* Point-in-time recovery: load the nearest snapshot, replay ops forward to the target version.
13. **History scrubbing** — *[We build]* A timeline slider drives snapshot rendering to move through past states.[^2]

[^1]: Compaction is ongoing, not one-time — CRDTs accumulate tombstones over heavy editing and must be periodically collapsed.
[^2]: Nice-to-have; may be deferred without affecting the rest.
[^3]: Implementation facts (`src/store/useYNote.js`): `Y.UndoManager` must be attached to `ytext` before persisted updates are replayed via `Y.applyUpdate` on boot — it only captures transactions that occur after construction, so attaching it after replay leaves its stack permanently empty. `Y.applyUpdate(doc, update)` (no explicit origin) runs with transaction origin `null`, which is in `Y.UndoManager`'s default `trackedOrigins` (`new Set([null])`), so replayed updates are tracked with no extra wiring. `Y.UndoManager` listens on the doc's `afterTransaction` event, which fires regardless of the transaction's `local` flag, so replay transactions (`local: false`) are captured the same as live-typing transactions (`local: true`). `captureTimeout` is held at 0 during replay so each persisted update becomes its own undo-stack item instead of merging into one (replay runs in a tight synchronous loop, well under the normal 500ms merge window), then restored to 500 after replay for normal live-typing grouping. Trade-off: undo history still resets at the last idle-GC compaction boundary, since compaction (`electron/db.js` `compactNote`) collapses the update log into one merged update by design (see item 10, storage growth/compaction).
[^4]: Implementation facts (`electron/db.js`, `src/store/useYNote.js`, `src/App.jsx`): cursor/selection is stored as `{anchor, head}` character offsets in the `app_state` table (key `cursor:<noteId>`) — the same key/value table `active_note_id` already uses, not new schema. The renderer debounces writes ~300ms after selection changes stop, with an immediate flush on window blur; on boot, `EditorSelection.single()` restores it (clamped to doc length) when the CodeMirror view is created. A plain absolute offset is sufficient — not a `Y.createRelativePositionFromTypeIndex` relative position — because the cursor is only restored once at boot, after all persisted updates have already been replayed; there is no concurrent edit between save and restore for a relative position to protect against. Gotcha hit while wiring this up: `useYNote`'s `undo`/`redo`/`saveCursor` must be wrapped in `useCallback` with an empty dependency array. As plain functions recreated on every render, a consuming effect that lists them as a dependency (as `App.jsx`'s CodeMirror-creation effect does) gets torn down and rebuilt on every unrelated re-render (e.g. toggling Vim mode) — which silently recreates the whole `EditorView` from the stale boot-time initial cursor instead of leaving the live view alone.

---

# Library Research — Non-Storage Spec Items (001)

Solution per item, tagged by source: *[Library]* (drop-in), *[Built-in]* (Electron API), *[We build]* (our code, usually on library primitives). Stack assumes Electron + React + CodeMirror 6 + Yjs.

## Editor & input
1. **Editor core (plain-text, fast)** — *[Library]* CodeMirror 6 (`@codemirror/state`, `@codemirror/view`); minimalSetup for a lean plain-text editor.
2. **Vim mode (toggle on/off)** — *[Library]* `@replit/codemirror-vim` v6.3.0 (0 deps); add/remove the `vim()` extension to toggle.
3. **Yjs ↔ editor binding** — *[Library]* `y-codemirror.next` (syncs content + remote cursors; carries relative positions for cursor restore).

## Tabs
4. **Drag-reorder tabs** — *[Library]* dnd-kit (`@dnd-kit/core` ~10kB + `@dnd-kit/sortable` + `@dnd-kit/modifiers` for axis lock); `arrayMove` reorders.
5. **Close-button width-freeze (Chrome behavior)** — *[We build]* freeze tab widths on close, reflow on mouse-leave of the strip.
6. **Overflow (shrink + horizontal scroll)** — *[We build]* CSS + measurement; deferred until needed.

## Window / OS integration
7. **Global shortcut / quick open** — *[Built-in]* Electron `globalShortcut` (fires even when unfocused).
8. **Tray icon + hide/show/quit** — *[Built-in]* Electron `Tray` + `BrowserWindow` events; close hides to tray, explicit Quit exits.

## Sections (collapsible blocks)
9. **Collapse blocks to preview** — *[Library]* CodeMirror `codeFolding` + `foldGutter` (`@codemirror/language`); ad-hoc folds via fold effects. Open: section-boundary rule (blank line vs marker) is an undecided build choice.
10. **Per-block copy** — *[We build]* copy the folded range's text (small glue over fold ranges).
11. **Per-block / note read-only lock** — *[Library]* CodeMirror `EditorState.readOnly` / `EditorView.editable.of(false)`, with a view-only style (dimmed background, lock icon, no caret) so the locked state is obvious.

## Multi-clipboard
12. **Capture sequential copies** — *[Built-in + Library]* Electron `clipboard` to read; `electron-clipboard-extended` to watch changes and append slots.
13. **Slots as reorderable sections / "new note from selection"** — *[We build]* reuse dnd-kit + note creation.

## Search
14. **Global search across tabs + archive + revisit** — *[Library]* MiniSearch (in-memory, fuzzy + prefix, 0 deps) indexing all three; FlexSearch is the faster alternative if volume grows.
15. **In-editor find** — *[Library]* CodeMirror `search` (`@codemirror/search`). Note: the panel opens only on editable views by default; showing it on read-only notes needs a small config.

---

# Open Questions (001)

None. All resolved and recorded in their source docs (spec, storage-history-research-002).
