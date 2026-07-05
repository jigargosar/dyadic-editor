// App: Phase 2 editor surface. CodeMirror 6 replaces the Phase 0/1 textarea,
// bound directly to the Yjs Y.Text from useYNote via y-codemirror.next.
// Undo/redo keeps routing through the shared Y.UndoManager (not CodeMirror's
// own history()) so restart-survival (docs/main-spec-001.md footnote 3)
// still applies — yUndoManagerKeymap is given Prec.highest so it wins over
// minimalSetup's built-in historyKeymap.
import { useEffect, useRef, useState } from 'react'
import { Compartment, EditorSelection, EditorState, Prec } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { minimalSetup } from 'codemirror'
import { vim } from '@replit/codemirror-vim'
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next'
import { useYNote } from './store/useYNote'

const editorTheme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: 'transparent', color: 'inherit' },
    '.cm-content': { padding: '1.5rem 1.75rem', caretColor: '#e5e5e5' },
    '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.625' },
    '.cm-placeholder': { color: '#737373' },
    '&.cm-focused': { outline: 'none' },
  },
  { dark: true },
)

export default function App() {
  const { ready, ytext, undoManager, awareness, initialCursor, saveCursor } = useYNote()
  const parentRef = useRef(null)
  const viewRef = useRef(null)
  const vimCompartmentRef = useRef(null)
  const [vimEnabled, setVimEnabled] = useState(false)

  useEffect(() => {
    if (!ready || !ytext || !parentRef.current) return

    const docLength = ytext.toString().length
    const clamp = (n) => Math.max(0, Math.min(n, docLength))
    const selection = initialCursor
      ? EditorSelection.single(clamp(initialCursor.anchor), clamp(initialCursor.head))
      : undefined

    // Ctrl+; toggles Vim mode by reconfiguring this compartment, rather than
    // tearing down the view — flipping vimEnabled alone must not lose focus,
    // scroll position, or the (unrelated) Yjs undo/redo stack.
    vimCompartmentRef.current = new Compartment()
    function toggleVim() {
      setVimEnabled((prev) => {
        const next = !prev
        const v = viewRef.current
        if (!v) return next
        // Collapse any active selection before entering Vim — otherwise vim
        // reads the leftover range (e.g. a restored cursor selection) as an
        // active Visual-mode selection instead of starting in Normal mode.
        v.dispatch({
          effects: vimCompartmentRef.current.reconfigure(next ? [vim()] : []),
          selection: next ? EditorSelection.cursor(v.state.selection.main.head) : undefined,
        })
        return next
      })
    }

    const view = new EditorView({
      parent: parentRef.current,
      state: EditorState.create({
        doc: ytext.toString(),
        selection,
        extensions: [
          vimCompartmentRef.current.of(vimEnabled ? [vim()] : []),
          Prec.highest(
            keymap.of([
              {
                key: 'Mod-;',
                run: () => {
                  toggleVim()
                  return true
                },
              },
            ]),
          ),
          minimalSetup,
          Prec.highest(keymap.of(yUndoManagerKeymap)),
          yCollab(ytext, awareness, { undoManager }),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ spellcheck: 'false' }),
          placeholder('Start typing.'),
          editorTheme,
          EditorView.updateListener.of((update) => {
            if (update.selectionSet) {
              const { anchor, head } = update.state.selection.main
              saveCursor(anchor, head)
            }
          }),
        ],
      }),
    })
    viewRef.current = view
    view.focus()

    return () => view.destroy()
  }, [ready, ytext, undoManager, awareness, initialCursor, saveCursor])

  return (
    <div className="relative flex h-full bg-neutral-900 text-neutral-200 font-mono">
      <main className="flex flex-1">
        <div ref={parentRef} className="flex-1 overflow-auto" />
      </main>
      {vimEnabled && (
        <div className="absolute bottom-2 right-3 text-xs text-neutral-500">VIM</div>
      )}
    </div>
  )
}
