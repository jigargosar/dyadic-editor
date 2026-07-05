# AI-Driven Testing — Tooling Reference (001)

Permanent reference for driving the running Dyadic app from Claude Code (click/type/screenshot/eval), instead of testing by hand. This is tooling documentation — it does not change with project status; see `docs/handoff.md` for current state.

## Setup

1. `electron/main.js` opens Chrome DevTools Protocol (CDP) on port 9222 in dev builds only: `app.commandLine.appendSwitch('remote-debugging-port', '9222')`, gated on `!app.isPackaged` — never active in a packaged build.
2. The app must already be running (`pnpm exec electron .`) before connecting — the MCP server attaches via CDP, it does not launch or quit the app itself.
3. Rebuild (`pnpm build`) before relaunching when testing a source change: CDP only appears if `dist-electron/main.js` is current — a stale build silently omits the switch.
4. Register the MCP server (machine-local config in `~/.claude.json`, not checked into the repo):
   `claude mcp add electron -e SECURITY_LEVEL=balanced -e SCREENSHOT_ENCRYPTION_KEY=<32-byte-hex> -- npx -y @laststance/electron-mcp-server@latest`
   `SCREENSHOT_ENCRYPTION_KEY` is required — generate with `openssl rand -hex 32` — the server crashes on start without it.
5. `@laststance/electron-mcp-server` writes a security key + logs to `logs/security/` in the project root at runtime (`.security-key`, `security-<date>.log`) — gitignored, machine-local, never commit it.

## Package warning

The unscoped `electron-mcp-server` package (same author, stuck at v1.5.0) is a stale predecessor of the scoped `@laststance/electron-mcp-server` — do not register that one. Its `send_keyboard_shortcut` command is unreliable for `Ctrl+`-combos: it produces garbled or no-op key events (confirmed by attaching a diagnostic `keydown` listener directly on `document` via `eval` and comparing the logged `key`/`ctrlKey` values against what was sent). `@laststance/electron-mcp-server`'s `electron_press_key` tool takes structured `{key, modifiers: []}` args instead of a parsed string, and delivers clean, correct key events.

## Tool notes

- `electron_eval` is blocked from performing synthetic DOM/event mutation under `SECURITY_LEVEL=balanced` — e.g. constructing and dispatching a `KeyboardEvent` via `eval` fails with `{success: false, error: "Command returned false - action likely failed"}`. Use the purpose-built tools below instead of `electron_eval` for anything that mutates the page; treat `electron_eval` as read-only/diagnostic (e.g. temporarily attaching a listener to observe events) rather than a mutation path.
- `electron_fill_input` sets a value via the native setter so React-controlled inputs update — equivalent to a paste, not simulated per-character typing.
- `electron_press_key` — reliable single-key + modifiers, e.g. `{key: "z", modifiers: ["Ctrl"]}`. Prefer this over `electron_send_keyboard_shortcut`'s string form for anything undo/redo- or hotkey-related.
- `list_electron_windows`, `electron_take_screenshot`, `electron_click_by_selector`, `electron_query_value_by_selector` — standard read/interact tools, no known gotchas.

## Alternatives considered

- Claude Code's built-in "computer-use" feature is CLI-only on macOS — not usable from a Windows session.
- Playwright was ruled out as too heavy for this project's needs; no Electron-specific alternative besides CDP-based tools was found.
