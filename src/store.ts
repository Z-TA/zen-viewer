import { load, Store } from "@tauri-apps/plugin-store";

export type Settings = {
  enableAcrylic: boolean;
  destinationFolder: string;
};

let settingsStore: Store;

export async function initSettings() {
  settingsStore = await load("settings.json", {
    autoSave: true,
    defaults: {
      enableAcrylic: true,
      destinationFolder: "",
    } satisfies Settings,
  });
}

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  if (!settingsStore) {
    await initSettings();
  }
  const value = await settingsStore.get<Settings[K]>(key);
  return value as Settings[K];
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  if (!settingsStore) {
    await initSettings();
  }
  await settingsStore.set(key, value);
}
