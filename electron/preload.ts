import { contextBridge, ipcRenderer } from 'electron';

// ── Context isolation bridge ───────────────────────────────
// Exposes a minimal, typed window.electron API to the renderer process.

interface ElectronAPI {
  profile: {
    switch(profileId: string): Promise<void>;
    getCurrent(): Promise<string>;
  };
  session: {
    record(data: unknown): Promise<void>;
  };
  theme: {
    change(theme: string): Promise<void>;
  };
}

const electronAPI: ElectronAPI = {
  profile: {
    switch: async (profileId: string): Promise<void> => {
      await ipcRenderer.invoke('profile:switch', profileId);
    },
    getCurrent: async (): Promise<string> => {
      return ipcRenderer.invoke('profile:get-current');
    },
  },
  session: {
    record: async (data: unknown): Promise<void> => {
      await ipcRenderer.invoke('session:record', data);
    },
  },
  theme: {
    change: async (theme: string): Promise<void> => {
      await ipcRenderer.invoke('theme:change', theme);
    },
  },
};

// Expose via window.electron
Object.assign(globalThis, { electron: electronAPI });

// Use contextBridge for safer IPC in Electron ≥ 33
(contextBridge as unknown as { register(name: string, handler: (...args: unknown[]) => unknown): void }).register(
  'profile:get-current',
  (): string => 'default',
);
