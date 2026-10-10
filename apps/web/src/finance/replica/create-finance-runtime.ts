import { coordinateTabs } from "./coordinate-tabs.ts";
import { createMemoryPersistence } from "./create-memory-persistence.ts";
import { createReplicaStore } from "./create-replica-store.ts";
import { createSyncLoop } from "./create-sync-loop.ts";
import { guardUnsavedOutbox } from "./guard-unsaved-outbox.ts";
import { openReplicaDb } from "./open-replica-db.ts";
import type { ReplicaPersistence } from "./types.ts";

interface FinanceRuntimeOptions {
  householdId: string;
  onUnauthorised: () => void;
  persistence?: ReplicaPersistence;
  fetch?: typeof fetch;
}

/** IndexedDB when it opens; memory when it does not, such as in some private windows. Only the first load falls back: a later one must not swap the Replica for an empty one. */
function fallbackPersistence(primary: ReplicaPersistence): ReplicaPersistence {
  let active = primary;
  let loadedOnce = false;
  return {
    async load() {
      try {
        return await active.load();
      } catch (error) {
        if (loadedOnce) throw error;
        active = createMemoryPersistence();
        return await active.load();
      } finally {
        loadedOnce = true;
      }
    },
    loadOutbox: () => active.loadOutbox(),
    write: (batch) => active.write(batch),
    close: () => {
      active.close();
    },
  };
}

/**
 * The Replica, its sync loop and the tab coordination for one Household.
 * `start` loads the Replica from disk and elects the tab that syncs; the
 * others reload from disk when it writes.
 */
export function createFinanceRuntime(options: FinanceRuntimeOptions) {
  const { householdId } = options;
  const deletedListeners = new Set<() => void>();
  const store = createReplicaStore({
    householdId,
    persistence:
      options.persistence ??
      fallbackPersistence(
        typeof indexedDB === "undefined"
          ? createMemoryPersistence()
          : openReplicaDb(householdId, () => {
              for (const listener of deletedListeners) listener();
            }),
      ),
  });
  const loop = createSyncLoop({
    store,
    fetch: options.fetch,
    onUnauthorised: options.onUnauthorised,
  });
  let loading: Promise<void> | null = null;
  let session = 0;
  let leader = false;
  const cleanups: (() => void)[] = [];
  let requestSync = () => {
    void loop.retryNow();
  };

  function stop() {
    session++;
    leader = false;
    for (const cleanup of cleanups.splice(0)) cleanup();
    loop.stop();
  }

  return {
    store,
    loop,

    /** Loads the Replica once, then joins the tab election. `stop` undoes it, and `start` works again after it. */
    async start() {
      stop();
      const current = session;
      loading ??= store.load();
      await loading;
      if (current !== session) return;
      const tabs = coordinateTabs({
        name: `finance-sync-${householdId}`,
        onLeader: () => {
          leader = true;
          loop.start();
        },
        onMessage: (message) => {
          if (message.type === "replica-changed" && !leader) {
            void store.reload();
          } else if (message.type === "outbox-changed" && leader) {
            void store.mergeOutboxFromDisk().then(() => loop.sync());
          } else if (message.type === "status" && !leader) {
            loop.followStatus(message.status);
          } else if (message.type === "sync-requested" && leader) {
            void loop.retryNow();
          }
        },
      });
      cleanups.push(() => {
        tabs.close();
      });
      cleanups.push(guardUnsavedOutbox(store, loop));
      requestSync = () => {
        if (leader) void loop.retryNow();
        else tabs.broadcast({ type: "sync-requested" });
      };
      cleanups.push(
        store.onLocalMutation(() => {
          if (!leader) tabs.broadcast({ type: "outbox-changed" });
        }),
      );
      let lastSyncedAt = loop.getStatus().lastSyncedAt;
      let announcedRevision = store.getDiskRevision();
      cleanups.push(
        loop.subscribeStatus(() => {
          if (!leader) return;
          const status = loop.getStatus();
          tabs.broadcast({ type: "status", status });
          if (status.lastSyncedAt === lastSyncedAt) return;
          lastSyncedAt = status.lastSyncedAt;
          const revision = store.getDiskRevision();
          if (revision !== announcedRevision) {
            announcedRevision = revision;
            void store.flush().then(() => {
              tabs.broadcast({ type: "replica-changed" });
            });
          }
        }),
      );
    },

    stop,

    /** Stops, then closes the Replica database for good, such as before sign-out deletes it. */
    close() {
      stop();
      store.close();
    },

    /** Calls `listener` when another tab deletes the Replica database, such as at sign-out. Returns the unsubscribe. */
    onReplicaDeleted(listener: () => void) {
      deletedListeners.add(listener);
      return () => {
        deletedListeners.delete(listener);
      };
    },

    /** Syncs now, such as after Retry; a tab that does not sync asks the one that does. */
    retry() {
      requestSync();
    },
  };
}

export type FinanceRuntime = ReturnType<typeof createFinanceRuntime>;
