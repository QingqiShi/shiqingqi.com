"use client";

import { useEffect } from "react";
import { guardOfflineNavigations } from "./guard-offline-navigations.ts";

/** Installs `guardOfflineNavigations` while the Finance app is open. */
export function OfflineNavigationGuard() {
  useEffect(() => guardOfflineNavigations(), []);
  return null;
}
