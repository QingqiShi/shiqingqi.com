"use client";

import { useDeferredValue, type ReactNode } from "react";
import { reveal } from "./reveal.stylex.ts";

interface DrawnAfterRestProps {
  /** Changes when the content is for something else, so the skeleton shows again. */
  contentKey?: string;
  /** Skips the skeleton and the fade where the content draws at once. */
  isImmediate?: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}

/**
 * Shows `skeleton` while the rest of the screen renders, then renders
 * `children` in a deferred pass of its own and fades them in.
 */
export function DrawnAfterRest({
  contentKey = "",
  isImmediate = false,
  skeleton,
  children,
}: DrawnAfterRestProps) {
  const drawnKey = useDeferredValue(contentKey, null);
  if (isImmediate) return children;
  if (drawnKey !== contentKey) return skeleton;
  return <div css={reveal.fadeIn}>{children}</div>;
}
