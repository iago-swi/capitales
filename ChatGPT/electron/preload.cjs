const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('capitalesDesktop', {
  loadDatabase: () => ipcRenderer.invoke('database:load'),
  saveDatabase: (bytes) => ipcRenderer.invoke('database:save', bytes),
  platform: process.platform,
})
