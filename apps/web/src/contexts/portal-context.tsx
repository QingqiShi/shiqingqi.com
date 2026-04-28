"use client";

import { createContext, use } from "react";

interface PortalContextValue {
  portalTarget: HTMLDivElement | null;
}

export const PortalContext = createContext<PortalContextValue | null>(null);

/**
 * Hook to access the portal target element.
 * Must be used within a PortalTargetProvider.
 */
export function usePortalTarget() {
  const context = use(PortalContext);
  if (!context) {
    throw new Error(
      "usePortalTarget must be used within a PortalTargetProvider",
    );
  }
  return context.portalTarget;
}
