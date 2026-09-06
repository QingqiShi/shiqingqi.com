import type { ChangeStore } from "@tuja/component-playground";
import { useEffect, useState } from "react";

/** Re-renders on every edit. The store is the one source of truth. */
export function useStoreVersion(store: ChangeStore): number {
  const [version, setVersion] = useState(0);
  useEffect(
    () =>
      store.subscribe(() => {
        setVersion((current) => current + 1);
      }),
    [store],
  );
  return version;
}
