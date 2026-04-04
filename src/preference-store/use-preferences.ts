"use client";

import { useEffect, useState } from "react";
import {
  clearPreferences,
  deletePreference,
  getAllPreferences,
  loadPreferencesContext,
  type StoredPreference,
} from "./preference-store";

/**
 * Loads all stored preferences from IndexedDB and provides mutators
 * for deleting individual items or clearing everything.
 */
export function usePreferences() {
  const [preferences, setPreferences] = useState<
    ReadonlyArray<StoredPreference>
  >([]);

  async function reload() {
    try {
      const all = await getAllPreferences();
      setPreferences(all);
    } catch {
      setPreferences([]);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function remove(id: string) {
    await deletePreference(id);
    await Promise.all([loadPreferencesContext(), reload()]);
  }

  async function clearAll() {
    await clearPreferences();
    await Promise.all([loadPreferencesContext(), reload()]);
  }

  return { preferences, reload, remove, clearAll } as const;
}
