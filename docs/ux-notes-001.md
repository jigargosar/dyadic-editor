# UX Notes (001)

Keyboard-first plain-text editor. Judgement calls flagged [J]; revise any.

## Layout [J]
1. Editor pane is primary and full-width.
2. Left rail (collapsible) holds three switchable lists: Tabs, Archive, Revisit.
3. Rail hidden by default; keyboard-summoned. No permanent chrome stealing writing space.

## Keyboard map [J]
4. Quick open (global, Win+Space) — restore last note.
5. New tab — Ctrl+T.
6. Close tab — Ctrl+W (recoverable).
7. Next/prev tab — Ctrl+Tab / Ctrl+Shift+Tab.
8. Global search — Ctrl+K (across tabs + archive + revisit).
9. In-editor find — Ctrl+F.
10. Toggle rail — Ctrl+B.
11. Toggle read-only — Ctrl+L.
12. Toggle Vim mode — Ctrl+; .
13. Insert section marker — Ctrl+Enter.

## Flows
14. Search (Ctrl+K): one input, results grouped by source; arrow-key move, Enter opens, Tab cycles source groups — fast switching over box count.
15. Close→recover: closed tab drops into Revisit by default; user can move to Archive.
16. Section: marker line folds; folded block shows 2–3 line preview; per-block copy and lock on hover.
17. Clipboard: dedicated Clipboard tab collects clips as slots; reorder; "new note from selection".

## States [J]
18. Empty editor: faint prompt "Start typing." — no modal, no onboarding.
19. Empty Archive/Revisit: one line explaining what lands there.
20. Read-only note: dimmed background, lock glyph in tab, caret hidden.
21. Quick-open with no prior note: opens a fresh blank tab.

## Principles
22. Never steal focus from the text; panels overlay or push, never reflow the caret.
23. Every mouse action has a keyboard equivalent.
24. Reduced-motion respected; visible keyboard focus everywhere.
