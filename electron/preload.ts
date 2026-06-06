import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('maTraders', {
  backup: () => ipcRenderer.invoke('app:backup'),
  getVersion: () => ipcRenderer.invoke('app:version'),
  isDesktop: true,
});
