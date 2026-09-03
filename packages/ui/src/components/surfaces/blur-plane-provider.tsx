"use client";

import { createContext, useMemo, useState, type ReactNode } from "react";

interface BlurPlaneValue {
  node: HTMLElement | null;
  setNode: (node: HTMLElement | null) => void;
}

/**
 * The page's Blur plane, or `null` outside a shell that keeps one. A floating
 * control reads it to paint its blur there; `null` leaves the blur beside the
 * control's own element.
 */
export const BlurPlaneContext = createContext<BlurPlaneValue | null>(null);

interface BlurPlaneProviderProps {
  children: ReactNode;
}

/**
 * Holds the page's Blur plane for the shell around it: the `BlurPlane` node
 * registers itself here, and every floating control under the provider
 * paints its own blur there.
 *
 * The node reaches consumers as state, not a ref, so a control that mounts
 * before the plane has to render again once it lands.
 */
export function BlurPlaneProvider({ children }: BlurPlaneProviderProps) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ node, setNode }), [node]);

  return <BlurPlaneContext value={value}>{children}</BlurPlaneContext>;
}
