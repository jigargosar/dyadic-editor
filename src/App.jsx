// App: Phase 1 shell. Textarea is still the Phase 0 surface (CodeMirror
// arrives in Phase 2); content is now backed by Yjs + SQLite persistence.
import { useYNote } from './store/useYNote'

export default function App() {
  const { text, updateText, ready, undo, redo } = useYNote()

  // Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) undo/redo. Native browser undo doesn't
  // track a React-controlled textarea's value, so this is the only undo path.
  function handleKeyDown(e) {
    const mod = e.ctrlKey || e.metaKey
    if (!mod) return
    const key = e.key.toLowerCase()
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      e.preventDefault()
      redo()
    }
  }

  return (
    // Full-height dark shell, mono type
    <div className="flex h-full bg-neutral-900 text-neutral-200 font-mono">
      <main className="flex flex-1">
        <textarea
          className="flex-1 resize-none border-none outline-none bg-transparent px-7 py-6 leading-relaxed placeholder:text-neutral-600"
          value={text}
          onChange={(e) => updateText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Start typing."
          spellCheck={false}
          autoFocus
          disabled={!ready}
        />
      </main>
    </div>
  )
}
