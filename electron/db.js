// Main-process persistence: one SQLite DB (node:sqlite, bundled with Electron's
// Node runtime — no native module/rebuild step) owns every write.
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import crypto from 'node:crypto'
import { generateNKeysBetween } from 'fractional-indexing'

let db = null

export function initDb(userDataPath) {
  db = new DatabaseSync(path.join(userDataPath, 'dyadic.db'))
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id TEXT NOT NULL,
      state_vector BLOB NOT NULL,
      snapshot BLOB NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  migrateTabColumns()
}

// Tabs (Phase 3) added "order" (fractional index — new tabs/reorders compute
// theirs renderer-side, see src/store/useTabs.js) and is_open after notes
// already shipped without them — ALTER TABLE ADD COLUMN rather than folding
// into the CREATE above, so existing installs' notes survive the upgrade
// instead of silently no-op'ing against an already-created table.
function migrateTabColumns() {
  const columns = db
    .prepare('PRAGMA table_info(notes)')
    .all()
    .map((c) => c.name)
  if (!columns.includes('order')) {
    db.exec('ALTER TABLE notes ADD COLUMN "order" TEXT')
  }
  if (!columns.includes('is_open')) {
    db.exec('ALTER TABLE notes ADD COLUMN is_open INTEGER NOT NULL DEFAULT 1')
  }
  backfillMissingOrders()
}

// ALTER TABLE ADD COLUMN leaves every pre-existing row NULL for "order" (no
// DEFAULT) — a null compares as neither less-than nor greater-than a
// fractional-indexing string, so it'd sort unpredictably against any tab
// created after the upgrade. Backfill once, oldest-first; a no-op on every
// later boot once nothing matches.
function backfillMissingOrders() {
  const rows = db.prepare('SELECT id FROM notes WHERE "order" IS NULL ORDER BY created_at ASC').all()
  if (rows.length === 0) return
  const keys = generateNKeysBetween(null, null, rows.length)
  rows.forEach((row, i) => {
    db.prepare('UPDATE notes SET "order" = ? WHERE id = ?').run(keys[i], row.id)
  })
}

function getAppState(key) {
  const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get(key)
  return row ? row.value : null
}

function setAppState(key, value) {
  db.prepare(
    'INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value)
}

export function getCursor(noteId) {
  const raw = getAppState(`cursor:${noteId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setCursor(noteId, anchor, head) {
  setAppState(`cursor:${noteId}`, JSON.stringify({ anchor, head }))
}

// Fractional order strings are computed renderer-side (see src/store/useTabs.js)
// so db.js stays a dumb persistence layer with no ordering logic of its own —
// on a brand-new install bootTabs() returns an empty tabs array and the
// renderer creates the first tab itself, same path as any other new tab.
export function bootTabs() {
  const tabs = db
    .prepare('SELECT id, "order" FROM notes WHERE is_open = 1 ORDER BY "order" ASC')
    .all()
  return { tabs, activeTabId: getAppState('active_note_id') }
}

export function getNote(noteId) {
  return { updates: loadUpdates(noteId), cursor: getCursor(noteId) }
}

export function createTab(order) {
  const id = crypto.randomUUID()
  const now = Date.now()
  db.prepare(
    'INSERT INTO notes (id, created_at, updated_at, "order", is_open) VALUES (?, ?, ?, ?, 1)'
  ).run(id, now, now, order)
  setAppState('active_note_id', id)
  return id
}

// Marks the note closed (dropped from the open-tabs list) without touching
// its update log or snapshots — Phase 5's archive/revisit buckets read from
// the same rows, so closing never destroys data (main-spec-001.md, Closed-Tab
// Recovery).
export function closeTab(noteId) {
  db.prepare('UPDATE notes SET is_open = 0 WHERE id = ?').run(noteId)
}

export function setTabOrder(noteId, order) {
  db.prepare('UPDATE notes SET "order" = ? WHERE id = ?').run(order, noteId)
}

export function setActiveTab(noteId) {
  setAppState('active_note_id', noteId)
}

export function loadUpdates(noteId) {
  return db
    .prepare('SELECT data FROM updates WHERE note_id = ? ORDER BY id ASC')
    .all(noteId)
    .map((row) => row.data)
}

export function appendUpdate(noteId, data) {
  const now = Date.now()
  db.prepare('INSERT INTO updates (note_id, data, created_at) VALUES (?, ?, ?)').run(noteId, data, now)
  db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(now, noteId)
}

function bytesEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

// Skips the insert when the state vector matches the last stored snapshot.
export function appendSnapshot(noteId, stateVector, snapshot) {
  const last = db
    .prepare('SELECT state_vector FROM snapshots WHERE note_id = ? ORDER BY id DESC LIMIT 1')
    .get(noteId)
  if (last && bytesEqual(new Uint8Array(last.state_vector), new Uint8Array(stateVector))) {
    return false
  }
  db.prepare(
    'INSERT INTO snapshots (note_id, state_vector, snapshot, created_at) VALUES (?, ?, ?, ?)'
  ).run(noteId, stateVector, snapshot, Date.now())
  return true
}

// Idle-only: collapses the update log into one merged update. Snapshots are
// untouched — they stay independently resolvable regardless of compaction.
export function compactNote(noteId, mergedUpdate) {
  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM updates WHERE note_id = ?').run(noteId)
    db.prepare('INSERT INTO updates (note_id, data, created_at) VALUES (?, ?, ?)').run(
      noteId,
      mergedUpdate,
      Date.now()
    )
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function vacuum() {
  db.exec('VACUUM')
}
