// Main-process persistence: one SQLite DB (node:sqlite, bundled with Electron's
// Node runtime — no native module/rebuild step) owns every write.
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import crypto from 'node:crypto'

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

function createNote() {
  const id = crypto.randomUUID()
  const now = Date.now()
  db.prepare('INSERT INTO notes (id, created_at, updated_at) VALUES (?, ?, ?)').run(id, now, now)
  setAppState('active_note_id', id)
  return id
}

export function getOrCreateActiveNote() {
  const existing = getAppState('active_note_id')
  if (existing && db.prepare('SELECT id FROM notes WHERE id = ?').get(existing)) {
    return existing
  }
  return createNote()
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
