// IndexedDB-backed settings (budget, biometric mock, etc.) with localStorage fallback.
import { get, set, createStore } from "idb-keyval";

const settingsStore = createStore("scango-settings-db", "kv");
const KEY = "user_settings";

export interface UserSettings {
  budgetLimit: number; // 0 = no limit
  biometricLock: boolean;
}

const DEFAULTS: UserSettings = { budgetLimit: 0, biometricLock: false };

export const loadSettings = async (): Promise<UserSettings> => {
  try {
    const v = (await get(KEY, settingsStore)) as UserSettings | undefined;
    if (v) return { ...DEFAULTS, ...v };
  } catch { /* noop */ }
  try {
    const raw = localStorage.getItem("scango.settings");
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* noop */ }
  return DEFAULTS;
};

export const saveSettings = async (s: UserSettings) => {
  try { await set(KEY, s, settingsStore); } catch { /* noop */ }
  try { localStorage.setItem("scango.settings", JSON.stringify(s)); } catch { /* noop */ }
};

export const clearAppCache = async () => {
  // Clear IndexedDB caches
  const dbs = ["scango-products-db", "scango-queue-db", "scango-settings-db"];
  await Promise.all(dbs.map((n) => new Promise<void>((res) => {
    const req = indexedDB.deleteDatabase(n);
    req.onsuccess = req.onerror = req.onblocked = () => res();
  })));
  // Clear app localStorage keys
  ["scango.cart.v1", "scango.settings", "scango.lang"].forEach((k) => {
    try { localStorage.removeItem(k); } catch { /* noop */ }
  });
};
