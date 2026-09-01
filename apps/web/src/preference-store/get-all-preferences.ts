import { STORE_NAME } from "./constants";
import { getPreferencesDb } from "./get-preferences-db";
import { isStoredPreference } from "./is-stored-preference";
import type { StoredPreference } from "./types";

export async function getAllPreferences(): Promise<StoredPreference[]> {
  const db = await getPreferencesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const raw: unknown[] = request.result;
      resolve(raw.filter(isStoredPreference));
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to read preferences"));
    };
  });
}
