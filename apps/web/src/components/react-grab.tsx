"use client";

import { useEffect } from "react";

/**
 * Loads React Grab (https://www.react-grab.com) in development only.
 *
 * React Grab lets you hover any rendered element and press ⌘C / Ctrl+C to copy
 * its source context (file, component stack, surrounding code) for pasting into
 * a coding agent. The package self-initialises on import, so we pull it in
 * client-side via a dynamic import. `process.env.NODE_ENV` is a build-time
 * constant, so SWC statically resolves the check below and eliminates
 * `ReactGrabEffect` (and the dynamic import) from production bundles.
 */
export function ReactGrab() {
  if (process.env.NODE_ENV !== "development") return null;
  return <ReactGrabEffect />;
}

function ReactGrabEffect() {
  useEffect(() => {
    void import("react-grab");
  }, []);

  return null;
}
