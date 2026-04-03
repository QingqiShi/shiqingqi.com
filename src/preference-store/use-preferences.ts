"use client";

import { useCallback, useEffect, useState } from "react";
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

  const reload = useCallback(async () => {
    try {
      const all = await getAllPreferences();
      setPreferences(all);
    } catch {
      setPreferences([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const remove = useCallback(
    async (id: string) => {
      await deletePreference(id);
      await Promise.all([loadPreferencesContext(), reload()]);
    },
    [reload],
  );

  const clearAll = useCallback(async () => {
    await clearPreferences();
    await Promise.all([loadPreferencesContext(), reload()]);
  }, [reload]);

  return { preferences, reload, remove, clearAll } as const;
}
