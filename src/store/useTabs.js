// Renderer-side Yjs bindings for every open tab. Every open tab keeps a live
// Y.Doc in memory — not just the active one — so tab titles (the live first
// line of each note) stay current even for background tabs; only the active
// tab's binding is ever handed to the CodeMirror view in App.jsx. Content
// persists through electron/db.js via IPC; ordering (fractional-indexing)
// lives entirely here — db.js never computes an order itself, see its
// bootTabs() comment.
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { generateKeyBetween } from 'fractional-indexing'

const SNAPSHOT_IDLE_MS = 2000
const SNAPSHOT_CEILING_MS = 5 * 60 * 1000
const GC_IDLE_MS = 30 * 1000
const CURSOR_IDLE_MS = 300

function bytesEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function firstLineTitle(ytext) {
  const firstLine = ytext.toString().split('\n', 1)[0].trim()
  return firstLine || 'Untitled'
}

function sortByOrder(list) {
  return [...list].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
}

export function useTabs() {
  const [ready, setReady] = useState(false)
  const [tabs, setTabs] = useState([])
  const [activeTabId, setActiveTabIdState] = useState(null)
  const bindingsRef = useRef(new Map())
  const tabsRef = useRef([])
  const activeTabIdRef = useRef(null)
  const [, forceRender] = useReducer((c) => c + 1, 0)

  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])
  useEffect(() => {
    activeTabIdRef.current = activeTabId
  }, [activeTabId])

  // gc: false (docs/main-spec-001.md storage §002) so deleted content stays
  // resolvable until idle compaction runs. UndoManager attaches before replay
  // so restart-survival works (footnote 3) — captureTimeout 0 during replay
  // keeps each persisted update its own undo-stack entry, then restored to
  // 500 for normal live-typing grouping.
  function createBinding(id, updates, cursor) {
    const doc = new Y.Doc({ gc: false })
    const ytext = doc.getText('content')
    const undoManager = new Y.UndoManager(ytext, { captureTimeout: 0 })
    updates.forEach((u) => Y.applyUpdate(doc, new Uint8Array(u)))
    undoManager.captureTimeout = 500

    const binding = {
      id,
      doc,
      ytext,
      undoManager,
      awareness: new Awareness(doc),
      initialCursor: cursor,
      title: firstLineTitle(ytext),
      lastSnapshotSV: null,
      idleTimer: null,
      gcTimer: null,
      cursorTimer: null,
      pendingCursor: null,
      ceilingTimer: null,
    }

    function takeSnapshot() {
      const sv = Y.encodeStateVector(doc)
      if (bytesEqual(sv, binding.lastSnapshotSV)) return
      const snapshot = Y.encodeSnapshot(Y.snapshot(doc))
      window.dyadic.pushSnapshot(id, sv, snapshot)
      binding.lastSnapshotSV = sv
    }

    function runIdleGC() {
      window.dyadic.idleGC(id, Y.encodeStateAsUpdate(doc))
    }

    // Registered after the replay above, so restoring persisted updates on
    // boot never re-pushes them back into storage.
    doc.on('update', (update) => {
      window.dyadic.pushUpdate(id, update)
      clearTimeout(binding.idleTimer)
      binding.idleTimer = setTimeout(takeSnapshot, SNAPSHOT_IDLE_MS)
      clearTimeout(binding.gcTimer)
      binding.gcTimer = setTimeout(runIdleGC, GC_IDLE_MS)
    })

    // Only the active tab's ytext ever actually changes (a single CodeMirror
    // view is bound at a time), but observing uniformly on every binding
    // means the tab strip's title updates live with no active/inactive
    // special-casing.
    ytext.observe(() => {
      binding.title = firstLineTitle(ytext)
      forceRender()
    })

    binding.flushCursor = () => {
      clearTimeout(binding.cursorTimer)
      if (binding.pendingCursor) {
        window.dyadic.pushCursor(id, binding.pendingCursor.anchor, binding.pendingCursor.head)
        binding.pendingCursor = null
      }
    }

    binding.takeSnapshot = takeSnapshot
    binding.ceilingTimer = setInterval(takeSnapshot, SNAPSHOT_CEILING_MS)

    return binding
  }

  function destroyBinding(binding) {
    clearTimeout(binding.idleTimer)
    clearTimeout(binding.gcTimer)
    clearInterval(binding.ceilingTimer)
    binding.flushCursor()
    binding.awareness.destroy()
  }

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const { tabs: bootedTabs, activeTabId: bootedActiveId } = await window.dyadic.bootTabs()
      if (cancelled) return

      // Fresh install: no notes exist yet — create the first tab the same
      // way any other new tab is created, so db.js needs no bootstrap logic.
      let list = bootedTabs
      if (list.length === 0) {
        const order = generateKeyBetween(null, null)
        const id = await window.dyadic.createTab(order)
        if (cancelled) return
        list = [{ id, order }]
      }

      await Promise.all(
        list.map(async ({ id }) => {
          const { updates, cursor } = await window.dyadic.getNote(id)
          if (cancelled) return
          bindingsRef.current.set(id, createBinding(id, updates, cursor))
        }),
      )
      if (cancelled) return

      const activeId = list.some((t) => t.id === bootedActiveId) ? bootedActiveId : list[0].id
      setTabs(sortByOrder(list))
      setActiveTabIdState(activeId)
      setReady(true)
    }

    boot()

    // Only the active tab ever has unsaved pending state (cursor debounce,
    // un-snapshotted edits) — background tabs are never written to.
    function flushActive() {
      const binding = bindingsRef.current.get(activeTabIdRef.current)
      binding?.takeSnapshot()
      binding?.flushCursor()
    }
    window.addEventListener('blur', flushActive)

    return () => {
      cancelled = true
      window.removeEventListener('blur', flushActive)
      bindingsRef.current.forEach(destroyBinding)
    }
  }, [])

  const switchTab = useCallback((id) => {
    setActiveTabIdState(id)
    window.dyadic.setActiveTab(id)
  }, [])

  const createTab = useCallback(async () => {
    const order = generateKeyBetween(tabsRef.current.at(-1)?.order ?? null, null)
    const id = await window.dyadic.createTab(order)
    bindingsRef.current.set(id, createBinding(id, [], null))
    setTabs((prev) => sortByOrder([...prev, { id, order }]))
    switchTab(id)
  }, [switchTab])

  const closeTab = useCallback(
    async (id) => {
      await window.dyadic.closeTab(id)
      const binding = bindingsRef.current.get(id)
      if (binding) destroyBinding(binding)
      bindingsRef.current.delete(id)

      const closedIndex = tabsRef.current.findIndex((t) => t.id === id)
      const remaining = tabsRef.current.filter((t) => t.id !== id)
      setTabs(remaining)

      if (activeTabIdRef.current !== id) return
      if (remaining.length === 0) {
        await createTab()
        return
      }
      const next = remaining[Math.max(0, closedIndex - 1)]
      switchTab(next.id)
    },
    [switchTab, createTab],
  )

  // Mirrors simple-gtd-2's reorderTask/reorderSection: recompute a fractional
  // order between the new neighbors rather than reindexing the whole list.
  const reorderTab = useCallback((id, index) => {
    const list = tabsRef.current.filter((t) => t.id !== id)
    const order = generateKeyBetween(list[index - 1]?.order ?? null, list[index]?.order ?? null)
    window.dyadic.reorderTab(id, order)
    setTabs(sortByOrder(tabsRef.current.map((t) => (t.id === id ? { ...t, order } : t))))
  }, [])

  // Stable identity (empty deps) so consumers can list these in a useEffect
  // dependency array without that effect re-running on every unrelated
  // re-render (see docs/main-spec-001.md footnote 4).
  const undo = useCallback(() => {
    bindingsRef.current.get(activeTabIdRef.current)?.undoManager.undo()
  }, [])

  const redo = useCallback(() => {
    bindingsRef.current.get(activeTabIdRef.current)?.undoManager.redo()
  }, [])

  const saveCursor = useCallback((anchor, head) => {
    const binding = bindingsRef.current.get(activeTabIdRef.current)
    if (!binding) return
    binding.pendingCursor = { anchor, head }
    clearTimeout(binding.cursorTimer)
    binding.cursorTimer = setTimeout(binding.flushCursor, CURSOR_IDLE_MS)
  }, [])

  const active = bindingsRef.current.get(activeTabId)

  return {
    ready,
    ytext: active?.ytext,
    undoManager: active?.undoManager,
    awareness: active?.awareness,
    initialCursor: active?.initialCursor,
    undo,
    redo,
    saveCursor,
    tabs: tabs.map((t) => ({ ...t, title: bindingsRef.current.get(t.id)?.title ?? 'Untitled' })),
    activeTabId,
    switchTab,
    createTab,
    closeTab,
    reorderTab,
  }
}
