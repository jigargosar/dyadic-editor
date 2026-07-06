// Tab strip: a flat, single-group sortable list (no cross-group nesting
// needed, unlike simple-gtd-2's sections/tasks) — drag-reorder via
// @dnd-kit/react, order recomputed as a fractional-indexing string (see
// src/store/useTabs.js reorderTab). Close-button width-freeze mirrors Chrome:
// closing a tab freezes every remaining tab's rendered pixel width in place
// (main-spec-001.md "Close-Button Width Freeze") so the next tab's X lands
// under a stationary cursor for rapid repeated closes, and only reflows back
// to even widths once the pointer leaves the strip.
import { useRef, useState } from 'react'
import { KeyboardSensor, PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom'
import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'

const tabDragSensors = [
  PointerSensor.configure({
    activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })],
    // A still click must stay a click (switch tab), not a drag; the close
    // button is exempted so pressing it never gets captured as a drag start.
    preventActivation: (event) =>
      event.target instanceof Element && event.target.closest('button') !== null,
  }),
  KeyboardSensor,
]

export function TabBar({ tabs, activeTabId, onSwitch, onClose, onReorder, onNewTab }) {
  const [frozenWidths, setFrozenWidths] = useState(null)
  const tabElsRef = useRef(new Map())

  function handleClose(id) {
    const widths = new Map()
    tabElsRef.current.forEach((el, tabId) => {
      if (tabId !== id && el) widths.set(tabId, el.getBoundingClientRect().width)
    })
    setFrozenWidths(widths)
    onClose(id)
  }

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled) return
        const { source } = event.operation
        if (!isSortable(source)) return
        onReorder(String(source.id), source.index)
      }}
    >
      <div
        onMouseLeave={() => setFrozenWidths(null)}
        className="flex items-stretch overflow-x-auto border-b border-neutral-800 bg-neutral-950"
      >
        {tabs.map((tab, index) => (
          <Tab
            key={tab.id}
            tab={tab}
            index={index}
            active={tab.id === activeTabId}
            frozenWidth={frozenWidths?.get(tab.id)}
            onSwitch={onSwitch}
            onClose={handleClose}
            registerEl={(el) => {
              if (el) tabElsRef.current.set(tab.id, el)
              else tabElsRef.current.delete(tab.id)
            }}
          />
        ))}
        <button
          onClick={onNewTab}
          aria-label="New tab"
          className="shrink-0 px-3 text-neutral-500 transition-colors hover:text-neutral-200"
        >
          +
        </button>
      </div>
    </DragDropProvider>
  )
}

function Tab({ tab, index, active, frozenWidth, onSwitch, onClose, registerEl }) {
  const { ref, isDragging } = useSortable({
    id: tab.id,
    index,
    group: 'tabs',
    type: 'tab',
    accept: 'tab',
    sensors: tabDragSensors,
  })

  const stateClasses = active
    ? 'bg-neutral-800 text-neutral-100'
    : 'text-neutral-400 hover:bg-neutral-900'

  return (
    <div
      ref={(el) => {
        ref(el)
        registerEl(el)
      }}
      onClick={() => onSwitch(tab.id)}
      style={frozenWidth ? { flex: `0 0 ${frozenWidth}px` } : undefined}
      className={`group flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-r border-neutral-800 px-3 py-2 text-sm transition-colors ${stateClasses} ${isDragging ? 'opacity-50' : ''}`}
    >
      <span className="min-w-0 flex-1 truncate">{tab.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose(tab.id)
        }}
        aria-label={`Close ${tab.title}`}
        className="shrink-0 rounded px-1 text-neutral-500 opacity-0 transition-colors hover:bg-neutral-700 hover:text-neutral-100 group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}
