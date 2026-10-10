import type { ReplicaStore } from "./create-replica-store.ts";
import type { SyncLoop } from "./create-sync-loop.ts";

/**
 * Keeps a local mutation from being lost when the page goes away: shows a
 * failed write in the sync status, tries the Outbox writes again when the
 * page hides, and asks before an unload while an Outbox write has not
 * committed. Returns the cleanup.
 */
export function guardUnsavedOutbox(store: ReplicaStore, loop: SyncLoop) {
  let guarding = false;
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
  };
  const update = () => {
    const state = store.getStorageState();
    loop.setStorageFailed(state.failed);
    const guard = state.unsaved > 0;
    if (guard === guarding) return;
    guarding = guard;
    if (guard) window.addEventListener("beforeunload", onBeforeUnload);
    else window.removeEventListener("beforeunload", onBeforeUnload);
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") void store.flush();
  };
  const onPageHide = () => {
    void store.flush();
  };

  update();
  const unsubscribe = store.subscribeStorage(update);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  return () => {
    unsubscribe();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    if (guarding) window.removeEventListener("beforeunload", onBeforeUnload);
    guarding = false;
  };
}
