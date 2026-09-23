"use client";

import { createGpuSurface } from "@tuja/gpu-surface";
import { color } from "@tuja/ui/tokens.stylex";
import { useEffect } from "react";

function isSwitchedOff() {
  if (new URLSearchParams(window.location.search).get("gpu") === "off") {
    return true;
  }
  try {
    return localStorage.getItem("gpu-surface") === "off";
  } catch {
    return false;
  }
}

/**
 * Draws the page background (`color.bgCanvas`) on the GPU surface. The root
 * background stays under the surface, so the page looks the same when the
 * surface cannot draw. `?gpu=off`, or `"off"` in the `gpu-surface` storage
 * key, keeps the surface off.
 */
export function GpuPageBackground() {
  useEffect(() => {
    if (isSwitchedOff()) return;
    const surface = createGpuSurface({ clearColor: color.bgCanvas });
    return () => {
      surface.destroy();
    };
  }, []);

  return null;
}
