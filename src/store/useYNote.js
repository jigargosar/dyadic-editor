// Renderer-side Yjs binding for the active note. Content persists through
// electron/db.js via IPC; this hook owns the doc, undo stack, and the
// snapshot/GC cadence. gc: false so deleted content stays resolvable until
// our own idle compaction runs (see docs/main-spec-001.md, storage §002).
import { useCallback, useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'

const SNAPSHOT_IDLE_MS = 2000
const SNAPSHOT_CEILING_MS = 5 * 60 * 1000
const GC_IDLE_MS = 30 * 1000
const CURSOR_IDLE_MS = 300

function bytesEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export function useYNote() {
  const [ready, setReady] = useState(false)

  const docRef = useRef(null)
  const ytextRef = useRef(null)
  const undoManagerRef = useRef(null)
  const awarenessRef = useRef(null)
  const noteIdRef = useRef(null)
  const lastSnapshotSVRef = useRef(null)
  const idleTimerRef = useRef(null)
  const gcTimerRef = useRef(null)
  const cursorTimerRef = useRef(null)
  const pendingCursorRef = useRef(null)
  const initialCursorRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let ceilingTimer = null

    function flushCursor() {
      clearTimeout(cursorTimerRef.current)
      const pending = pendingCursorRef.current
      if (pending && noteIdRef.current) {
        window.dyadic.pushCursor(noteIdRef.current, pending.anchor, pending.head)
        pendingCursorRef.current = null
      }
    }

    function takeSnapshot() {
      const doc = docRef.current
      if (!doc) return
      const sv = Y.encodeStateVector(doc)
      if (bytesEqual(sv, lastSnapshotSVRef.current)) return
      const snapshot = Y.encodeSnapshot(Y.snapshot(doc))
      window.dyadic.pushSnapshot(noteIdRef.current, sv, snapshot)
      lastSnapshotSVRef.current = sv
    }

    function runIdleGC() {
      const doc = docRef.current
      if (!doc) return
      window.dyadic.idleGC(noteIdRef.current, Y.encodeStateAsUpdate(doc))
    }

    async function init() {
      const { noteId, updates, cursor } = await window.dyadic.getActiveNote()
      if (cancelled) return
      initialCursorRef.current = cursor

      // gc: false — see file header.
      const doc = new Y.Doc({ gc: false })
      const ytext = doc.getText('content')

      // Attach the UndoManager before replay (captureTimeout 0 so each
      // persisted update lands as its own stack item instead of merging into
      // one blob) so undo/redo history rebuilds from the update log on boot.
      // Y.applyUpdate uses origin null, which UndoManager tracks by default.
      // This history resets at the last idle-GC compaction (electron/db.js
      // compactNote collapses the update log into one merged update) — same
      // storage-growth trade-off already accepted for that feature.
      const undoManager = new Y.UndoManager(ytext, { captureTimeout: 0 })
      updates.forEach((u) => Y.applyUpdate(doc, new Uint8Array(u)))
      undoManager.captureTimeout = 500

      docRef.current = doc
      ytextRef.current = ytext
      undoManagerRef.current = undoManager
      awarenessRef.current = new Awareness(doc)
      noteIdRef.current = noteId

      // Registered after the replay above, so restoring persisted updates
      // on boot never re-pushes them back into storage.
      doc.on('update', (update) => {
        window.dyadic.pushUpdate(noteId, update)
        clearTimeout(idleTimerRef.current)
        idleTimerRef.current = setTimeout(takeSnapshot, SNAPSHOT_IDLE_MS)
        clearTimeout(gcTimerRef.current)
        gcTimerRef.current = setTimeout(runIdleGC, GC_IDLE_MS)
      })

      setReady(true)

      ceilingTimer = setInterval(takeSnapshot, SNAPSHOT_CEILING_MS)
      window.addEventListener('blur', takeSnapshot)
      window.addEventListener('blur', flushCursor)
    }

    init()

    return () => {
      cancelled = true
      clearTimeout(idleTimerRef.current)
      clearTimeout(gcTimerRef.current)
      clearInterval(ceilingTimer)
      window.removeEventListener('blur', takeSnapshot)
      window.removeEventListener('blur', flushCursor)
      flushCursor()
      awarenessRef.current?.destroy()
    }
  }, [])

  // Stable identity (empty deps — these only close over refs) so consumers
  // can safely put them in a useEffect dependency array without that effect
  // re-running (and e.g. tearing down a CodeMirror view) on every render.
  const undo = useCallback(() => {
    undoManagerRef.current?.undo()
  }, [])

  const redo = useCallback(() => {
    undoManagerRef.current?.redo()
  }, [])

  // Debounced: selection changes fire on every cursor move/keystroke, so this
  // coalesces rapid updates into one IPC write ~CURSOR_IDLE_MS after they stop.
  const saveCursor = useCallback((anchor, head) => {
    pendingCursorRef.current = { anchor, head }
    clearTimeout(cursorTimerRef.current)
    cursorTimerRef.current = setTimeout(() => {
      const pending = pendingCursorRef.current
      if (pending && noteIdRef.current) {
        window.dyadic.pushCursor(noteIdRef.current, pending.anchor, pending.head)
        pendingCursorRef.current = null
      }
    }, CURSOR_IDLE_MS)
  }, [])

  return {
    ready,
    ytext: ytextRef.current,
    undoManager: undoManagerRef.current,
    awareness: awarenessRef.current,
    initialCursor: initialCursorRef.current,
    undo,
    redo,
    saveCursor,
  }
}
