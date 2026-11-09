"use client";

import { useEffect } from "react";
import { initPostHog } from "./init-post-hog.ts";

/** Renders nothing — see initPostHog for why this cannot run before hydration. */
export function PostHogInit() {
  useEffect(() => {
    void initPostHog();
  }, []);

  return null;
}
