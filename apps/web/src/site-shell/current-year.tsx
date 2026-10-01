"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return new Date().getFullYear();
}

export function CurrentYear({ initialYear }: { initialYear: number }) {
  const year = useSyncExternalStore(subscribe, getSnapshot, () => initialYear);
  return <>{year}</>;
}
