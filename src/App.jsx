// App: Phase 0 shell. Single full-bleed empty editor surface.
// CodeMirror + Yjs arrive in Phase 1/2; textarea placeholder for now.
import { useState } from 'react'

export default function App() {
  const [text, setText] = useState('')

  return (
    // Full-height dark shell, mono type
    <div className="flex h-full bg-neutral-900 text-neutral-200 font-mono">
      <main className="flex flex-1">
        <textarea
          className="flex-1 resize-none border-none outline-none bg-transparent px-7 py-6 leading-relaxed placeholder:text-neutral-600"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start typing."
          spellCheck={false}
          autoFocus
        />
      </main>
    </div>
  )
}
