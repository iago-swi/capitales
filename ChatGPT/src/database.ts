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

let opening: Promise<void> | undefined
export function openDatabase() {
  return opening ??= initialize()
}

async function initialize() {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const bytes = await persistedBytes()
  database = bytes ? new SQL.Database(bytes) : new SQL.Database()
  // The original scores table remains an archive of points out of ten.
  database.run(`CREATE TABLE IF NOT EXISTS mode_scores (
    id INTEGER PRIMARY KEY, mode TEXT NOT NULL, name TEXT NOT NULL, score INTEGER NOT NULL
  )`)
  await persist()
}

export type HighScore = { id: number; name: string; score: number }
type Mode = import('./scoring').Mode
export function getHighScores(mode: Mode): HighScore[] {
  const query = database.exec('SELECT id,name,score FROM mode_scores WHERE mode=? ORDER BY score DESC,id LIMIT 10',[mode])
  return (query[0]?.values ?? []).map(([id,name,score]) => ({id:Number(id),name:String(name),score:Number(score)}))
}
export async function saveScore(mode: Mode, name: string, score: number) {
  database.run('INSERT INTO mode_scores(mode,name,score) VALUES (?,?,?)',[mode,name.slice(0,24),score])
  database.run('DELETE FROM mode_scores WHERE mode=? AND id NOT IN (SELECT id FROM mode_scores WHERE mode=? ORDER BY score DESC,id LIMIT 10)',[mode,mode])
  await persist()
}
export async function clearScores(mode: Mode) {
  database.run('DELETE FROM mode_scores WHERE mode=?',[mode])
  await persist()
}
