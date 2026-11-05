import type { SyncStatus } from "./types.ts";

export function createSyncStatusStore(initialStatus: SyncStatus) {
  let status = initialStatus;
  /** This device can not write the Replica; it shows over every other problem. */
  let storageFailed = false;
  /** The row shape of a newer tab. This tab then never syncs again. */
  let newerTabRowShape: number | null = null;
  let shown = status;
  const statusListeners = new Set<() => void>();

  function setStatus(patch: Partial<SyncStatus>) {
    status = { ...status, ...patch };
    let next = status;
    if (newerTabRowShape !== null) {
      next = {
        ...next,
        problem: "outdated",
        activity: "idle",
        leader: false,
        newerRowShape: Math.max(newerTabRowShape, next.newerRowShape ?? 0),
      };
    }
    if (storageFailed) next = { ...next, problem: "storage" };
    if (
      next.online === shown.online &&
      next.activity === shown.activity &&
      next.pendingCount === shown.pendingCount &&
      next.lastSyncedAt === shown.lastSyncedAt &&
      next.problem === shown.problem &&
      next.failures === shown.failures &&
      next.pushProblem === shown.pushProblem &&
      next.pushFailures === shown.pushFailures &&
      next.leader === shown.leader &&
      next.newerRowShape === shown.newerRowShape
    ) {
      return;
    }
    shown = next;
    for (const listener of statusListeners) listener();
  }

  return {
    setStatus,

    reportedProblem() {
      return status.problem;
    },

    hasNewerTab() {
      return newerTabRowShape !== null;
    },

    noteNewerTab(newerRowShape: number) {
      newerTabRowShape = Math.max(newerTabRowShape ?? 0, newerRowShape);
    },

    getStatus: (): SyncStatus => {
      return shown;
    },

    /** The status before the first sync. The server renders this status because it does not sync. */
    getServerStatus: (): SyncStatus => {
      return initialStatus;
    },

    /** Shows that the Replica can not write to disk, until a write works again. */
    setStorageFailed: (failed: boolean) => {
      storageFailed = failed;
      setStatus({});
    },

    subscribeStatus: (listener: () => void) => {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },
  };
}
