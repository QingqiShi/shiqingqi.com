import { act, renderHook } from "@testing-library/react";
import { useTheme } from "../use-theme.ts";

/**
 * Removes the stored Theme, and the copy that `useTheme` keeps in memory, as
 * when another tab clears it. Thus the next render reads only localStorage.
 */
export function resetTheme() {
  const { unmount } = renderHook(() => useTheme());
  act(() => {
    localStorage.removeItem("theme");
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "theme",
        newValue: null,
        storageArea: localStorage,
      }),
    );
  });
  unmount();
}
