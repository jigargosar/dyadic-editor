# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Dyadic — tab-based plain-text desktop editor (Electron + React + Vite). Zero data loss is the north star: no typed character is ever lost, and every tab restores exactly on relaunch.

## Stack

- Package manager: **pnpm only** — no npm/yarn lockfiles or artifacts.
- Vite 8 + `@vitejs/plugin-react`; Electron 43 via `vite-plugin-electron` (main/preload built from `electron/main.js`, `electron/preload.js`; renderer/main/preload share one `vite.config.js`). The `simple` API forces the preload build to CJS regardless of the package's ESM `"type": "module"` — Electron's sandboxed preload loader can't execute ESM `import`.
- Tailwind v4 via `@tailwindcss/vite` — single `@import "tailwindcss";` in `src/index.css`, no `tailwind.config.js`.
- Plain JavaScript (`.jsx`), not TypeScript.
- Yjs (CRDT core) + `node:sqlite` persistence for the storage/undo-history layer (Phase 1) — see `docs/main-spec-001.md` §"Storage & History — Resolution (002)".

## Commands

- `pnpm install` — install dependencies
- `pnpm build` — compiles renderer + `dist-electron/main.js` + `preload.js`
- `pnpm exec electron .` — launch the built app
- `pnpm dev` — Vite dev server; `vite-plugin-electron` auto-launches Electron and hot-restarts the main process on `electron/*.js` changes, with renderer HMR and preload reload — no manual build/relaunch needed during dev
- `pnpm kill` — kills stray dev Electron instances (`scripts/kill-electron.js`), matched by exact executable path so it never touches other Electron apps (VS Code, Slack, etc.) running from different paths, unlike matching by process name. Resolves the path via `import electron from 'electron'` (no hardcoded version), so it stays correct across Electron upgrades. A single `electron .` launch spawns several OS processes sharing that path (main + renderer + GPU + utility) — the script kills all of them at once, and finding zero matches is a safe no-op.

## Docs

- @docs/handoff.md — current phase status and next steps
- @docs/build-plan-001.md — full phased build order
- @docs/main-spec-001.md — locked product decisions and storage/history architecture
- @docs/ux-notes-001.md — keyboard map and UX flows
- @docs/ai-testing-001.md — driving the running app from Claude Code (MCP setup, tool gotchas, package warnings)
