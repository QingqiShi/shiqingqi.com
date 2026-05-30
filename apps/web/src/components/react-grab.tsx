"use client";

import { useEffect } from "react";

/**
 * Loads React Grab (https://www.react-grab.com) in development only.
 *
 * React Grab lets you hover any rendered element and press ⌘C / Ctrl+C to copy
 * its source context (file, component stack, surrounding code) for pasting into
 * a coding agent. The package self-initialises on import, so we pull it in
 * client-side via a dynamic import. The `NODE_ENV` guard wraps the whole effect
 * so SWC drops it from production builds — the import is never emitted and the
 * library stays out of the bundle. The conditional hook call is safe because
 * `process.env.NODE_ENV` is a build-time constant, so the branch never varies
 * between renders; the lint rule just can't see that.
 */
export function ReactGrab() {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line react-hooks/rules-of-hooks, @eslint-react/rules-of-hooks
    useEffect(() => {
      void import("react-grab");
    }, []);
  }

  return null;
}
