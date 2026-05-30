"use client";

import { useEffect } from "react";

/**
 * Loads React Grab (https://www.react-grab.com) in development only.
 *
 * React Grab lets you hover any rendered element and press ⌘C / Ctrl+C to copy
 * its source context (file, component stack, surrounding code) for pasting into
 * a coding agent. The package self-initialises on import, so we pull it in
 * client-side via a dynamic import. The `NODE_ENV` guard is statically replaced
 * at build time, so the import is dead-code-eliminated from production bundles.
 */
export function ReactGrab() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      void import("react-grab");
    }
  }, []);

  return null;
}
