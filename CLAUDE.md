# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Dyadic — tab-based plain-text desktop editor (Electron + React + Vite). Zero data loss is the north star: no typed character is ever lost, and every tab restores exactly on relaunch.

## Stack

- Package manager: **pnpm only** — no npm/yarn lockfiles or artifacts.
- Vite 8 + `@vitejs/plugin-react`; Electron 43 via `vite-plugin-electron` (main/preload built from `electron/main.js`, `electron/preload.js`; renderer/main/preload share one `vite.config.js`).
- Tailwind v4 via `@tailwindcss/vite` — single `@import "tailwindcss";` in `src/index.css`, no `tailwind.config.js`.
- Plain JavaScript (`.jsx`), not TypeScript.

## Commands

- `pnpm build` — compiles renderer + `dist-electron/main.js` + `preload.js`
- `pnpm exec electron .` — launch the built app
- `pnpm dev` — Vite dev server (renderer only, no Electron shell)

## AI-driven testing

- `electron/main.js` opens CDP on port 9222 in dev builds (`--remote-debugging-port`, gated on `!app.isPackaged` — never active packaged).
- To drive the running app (click/type/screenshot/eval) instead of testing by hand, register `electron-mcp-server` as an MCP server:
  `claude mcp add electron -e SECURITY_LEVEL=balanced -e SCREENSHOT_ENCRYPTION_KEY=<32-byte-hex> -- npx -y electron-mcp-server`
  (the key is required — generate with `openssl rand -hex 32` — the server crashes on start without it).
- Rebuild (`pnpm build`) before relaunching: CDP only appears if `dist-electron/main.js` is current — a stale build silently omits it.
- The MCP server attaches via CDP; it does not launch/quit the app itself — start it separately with `pnpm exec electron .`.

## Docs

- @docs/handoff.md — current phase status and next steps
- @docs/build-plan-001.md — full phased build order
- @docs/main-spec-001.md — locked product decisions and storage/history architecture
- @docs/ux-notes-001.md — keyboard map and UX flows
