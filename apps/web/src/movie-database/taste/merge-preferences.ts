import { STORE_NAME } from "./constants";
import { getPreferencesDb } from "./get-preferences-db";
import { loadPreferencesContext } from "./load-preferences-context";
import { makeId } from "./make-id";
import type { StoredPreference } from "./types";

export async function mergePreferences(
  preferences: ReadonlyArray<{
    category: StoredPreference["category"];
    value: string;
    sentiment: StoredPreference["sentiment"];
  }>,
): Promise<void> {
  const db = await getPreferencesDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const now = Date.now();

  for (const pref of preferences) {
    const record: StoredPreference = {
      id: makeId(pref.category, pref.value),
      category: pref.category,
      value: pref.value,
      sentiment: pref.sentiment,
      updatedAt: now,
    };
    store.put(record);
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error("Failed to merge preferences"));
    };
  });
  await loadPreferencesContext();
}
