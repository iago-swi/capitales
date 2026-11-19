/// <reference types="vite/client" />

declare module 'world-atlas/countries-110m.json'
declare module 'sql.js/dist/sql-wasm.wasm?url' { const url: string; export default url }

interface Window {
  capitalesDesktop?: {
    loadDatabase: () => Promise<Uint8Array | null>
    saveDatabase: (bytes: Uint8Array) => Promise<void>
    platform: string
  }
}
