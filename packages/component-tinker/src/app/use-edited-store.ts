import type { ChangeStore } from "@tuja/component-tinker";
import { useEffect, useState } from "react";

/**
 * Re-renders on every edit. The store is the one source of truth, and
 * `version` counts the edits.
 */
export function useEditedStore(changeStore: ChangeStore): {
  store: ChangeStore;
  version: number;
} {
  const [edited, setEdited] = useState({ store: changeStore, version: 0 });
  useEffect(
    () =>
      changeStore.subscribe(() => {
        // React Compiler keeps a value that it read from an object until the
        // object changes. Each edit gives a new object, so a component that
        // reads the store renders the edit. The copy uses the same state.
        setEdited((current) => ({
          store: { ...changeStore },
          version: current.version + 1,
        }));
      }),
    [changeStore],
  );
  return edited;
}
