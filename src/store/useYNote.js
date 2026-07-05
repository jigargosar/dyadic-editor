// Renderer-side Yjs binding for the active note. Content persists through
// electron/db.js via IPC; this hook owns the doc, undo stack, and the
// snapshot/GC cadence. gc: false so deleted content stays resolvable until
// our own idle compaction runs (see docs/main-spec-001.md, storage §002).
import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'

const SNAPSHOT_IDLE_MS = 2000
const SNAPSHOT_CEILING_MS = 5 * 60 * 1000
const GC_IDLE_MS = 30 * 1000

function bytesEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

// Minimal common-prefix/suffix diff so each keystroke becomes one small Yjs
// op instead of a full-text replace (keeps updates and undo steps granular).
function applyTextDiff(ytext, oldStr, newStr) {
  if (oldStr === newStr) return
  let start = 0
  const maxStart = Math.min(oldStr.length, newStr.length)
  while (start < maxStart && oldStr[start] === newStr[start]) start++
  let endOld = oldStr.length
  let endNew = newStr.length
  while (endOld > start && endNew > start && oldStr[endOld - 1] === newStr[endNew - 1]) {
    endOld--
    endNew--
  }
  ytext.doc.transact(() => {
    if (endOld > start) ytext.delete(start, endOld - start)
    if (endNew > start) ytext.insert(start, newStr.slice(start, endNew))
  })
}

export function useYNote() {
  const [text, setText] = useState('')
  const [ready, setReady] = useState(false)

  const docRef = useRef(null)
  const ytextRef = useRef(null)
  const undoManagerRef = useRef(null)
  const noteIdRef = useRef(null)
  const lastSnapshotSVRef = useRef(null)
  const idleTimerRef = useRef(null)
  const gcTimerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let ceilingTimer = null

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
      const { noteId, updates } = await window.dyadic.getActiveNote()
      if (cancelled) return

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

      setText(ytext.toString())
      setReady(true)

      ceilingTimer = setInterval(takeSnapshot, SNAPSHOT_CEILING_MS)
      window.addEventListener('blur', takeSnapshot)
    }

    init()

    return () => {
      cancelled = true
      clearTimeout(idleTimerRef.current)
      clearTimeout(gcTimerRef.current)
      clearInterval(ceilingTimer)
      window.removeEventListener('blur', takeSnapshot)
    }
  }, [])

  function updateText(newValue) {
    const ytext = ytextRef.current
    if (!ytext) return
    applyTextDiff(ytext, ytext.toString(), newValue)
    setText(ytext.toString())
  }

  function undo() {
    undoManagerRef.current?.undo()
    setText(ytextRef.current?.toString() ?? '')
  }

  function redo() {
    undoManagerRef.current?.redo()
    setText(ytextRef.current?.toString() ?? '')
  }

  return { text, updateText, ready, undo, redo }
}
