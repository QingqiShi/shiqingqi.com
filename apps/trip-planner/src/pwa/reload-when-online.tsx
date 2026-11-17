"use client";

import { useEffect } from "react";

/**
 * Loads the page again when the device comes online, so that the page that
 * had no copy on this device takes the place of the offline page. An
 * installed app has no reload button.
 */
export function ReloadWhenOnline() {
  useEffect(() => {
    const reload = () => {
      window.location.reload();
    };
    window.addEventListener("online", reload);
    return () => {
      window.removeEventListener("online", reload);
    };
  }, []);
  return null;
}
