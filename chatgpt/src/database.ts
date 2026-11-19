import initSqlJs, { type Database } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const browserKey = 'capitales.sqlite.base64'
let database: Database

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}
const base64ToBytes = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0))

async function persistedBytes() {
  if (window.capitalesDesktop) return window.capitalesDesktop.loadDatabase()
  const value = localStorage.getItem(browserKey)
  return value ? base64ToBytes(value) : null
}

async function persist() {
  const bytes = database.export()
  if (window.capitalesDesktop) await window.capitalesDesktop.saveDatabase(bytes)
  else localStorage.setItem(browserKey, bytesToBase64(bytes))
}

export async function openDatabase() {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const bytes = await persistedBytes()
  database = bytes ? new SQL.Database(bytes) : new SQL.Database()
  database.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT 'Anonymous',
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      played_at TEXT NOT NULL
    );
  `)
  const columns = database.exec('PRAGMA table_info(scores)')[0]?.values.map((row) => String(row[1])) ?? []
  if (!columns.includes('name')) database.run("ALTER TABLE scores ADD COLUMN name TEXT NOT NULL DEFAULT 'Anonymous'")
  await persist()
}

export type HighScore = { name: string; score: number; total: number; playedAt: string }
export async function saveScore(name: string, score: number, total: number) {
  database.run('INSERT INTO scores (name, score, total, played_at) VALUES (?, ?, ?, ?)', [name.trim().slice(0, 24), score, total, new Date().toISOString()])
  database.run('DELETE FROM scores WHERE id NOT IN (SELECT id FROM scores ORDER BY score DESC, played_at ASC LIMIT 10)')
  await persist()
}

export function getHighScores(): HighScore[] {
  const result = database.exec('SELECT name, score, total, played_at FROM scores ORDER BY score DESC, played_at ASC LIMIT 10')[0]
  return result ? result.values.map((row) => ({ name:String(row[0]), score:Number(row[1]), total:Number(row[2]), playedAt:String(row[3]) })) : []
}
export function qualifiesForHighScore(score: number) {
  const scores = getHighScores()
  return scores.length < 10 || score >= scores[scores.length - 1].score
}
