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
    try {
      await deletePreference(id);
      await Promise.all([loadPreferencesContext(), reload()]);
    } catch {
      // IndexedDB may be unavailable (private browsing, quota exceeded).
      // Reload to keep the UI consistent with what is actually stored.
      await reload();
    }
  }

  async function clearAll() {
    try {
      await clearPreferences();
      await Promise.all([loadPreferencesContext(), reload()]);
    } catch {
      // IndexedDB may be unavailable (private browsing, quota exceeded).
      // Reload to keep the UI consistent with what is actually stored.
      await reload();
    }
  }

  return { preferences, reload, remove, clearAll } as const;
}
