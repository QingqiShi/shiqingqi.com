import { STORE_NAME } from "./constants";
import { getPreferencesDb } from "./get-preferences-db";
import { loadPreferencesContext } from "./load-preferences-context";

export async function deletePreference(id: string): Promise<void> {
  const db = await getPreferencesDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error("Failed to delete preference"));
    };
  });
  await loadPreferencesContext();
}
