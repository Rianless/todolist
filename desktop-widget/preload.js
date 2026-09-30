const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widget', {
  getConfig: () => ipcRenderer.invoke('config'),
  openWeb: path => ipcRenderer.send('open-web', path),
  api: (method, path, body) => ipcRenderer.invoke('api', { method, path, body }),
  togglePin: () => ipcRenderer.invoke('toggle-pin'),
  minimize: () => ipcRenderer.send('minimize'),
  hide: () => ipcRenderer.send('hide'),
  onPinChanged: cb => ipcRenderer.on('pin-changed', (_e, value) => cb(value))
});
