const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')

const databasePath = () => path.join(app.getPath('userData'), 'capitales.sqlite')

ipcMain.handle('database:load', async () => {
  try { return await fs.readFile(databasePath()) } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
})

ipcMain.handle('database:save', async (_event, bytes) => {
  await fs.writeFile(databasePath(), Buffer.from(bytes))
})

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize
  const width = Math.min(1120, Math.floor(workArea.width * 0.9))
  const height = Math.min(720, Math.floor(workArea.height * 0.88))
  const window = new BrowserWindow({
    width,
    height,
    minWidth: Math.min(760, width),
    minHeight: Math.min(560, height),
    center: true,
    backgroundColor: '#071d2d',
    title: 'Capitales',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  })
  if (!app.isPackaged) window.loadURL('http://localhost:5173')
  else window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => BrowserWindow.getAllWindows().length || createWindow())
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
