import { REPLICA_ROW_SHAPE } from "../sync/replica-row-shape.ts";
import { coordinateTabs } from "./coordinate-tabs.ts";
import { createMemoryPersistence } from "./create-memory-persistence.ts";
import { createReplicaStore } from "./create-replica-store.ts";
import { createSyncLoop } from "./create-sync-loop.ts";
import { guardUnsavedOutbox } from "./guard-unsaved-outbox.ts";
import { openReplicaDb } from "./open-replica-db.ts";
import { reloadForRowShape } from "./reload-for-row-shape.ts";
import { reloadPage } from "./reload-page.ts";
import type { ReplicaPersistence } from "./types.ts";

interface FinanceRuntimeOptions {
  householdId: string;
  /**
   * The demo: the server refuses every write, so the Replica stays in this
   * tab's memory and the Outbox is never sent. A reload drops every change,
   * and nothing stays on the device.
   */
  readOnly?: boolean;
  onUnauthorised: () => void;
  persistence?: ReplicaPersistence;
  fetch?: typeof fetch;
  /** Tests give another row shape to act as older or newer code. */
  rowShape?: number;
  /** Tests replace the page reload. */
  reload?: (confirm?: () => boolean) => Promise<boolean>;
}

/** IndexedDB when it opens; memory when it does not, such as in some private windows. Only the first load falls back: a later one must not swap the Replica for an empty one. */
function fallbackPersistence(primary: ReplicaPersistence | null) {
  let active = primary ?? createMemoryPersistence();
  let inMemory = primary === null;
  let loadedOnce = false;
  const persistence: ReplicaPersistence = {
    async load() {
      try {
        return await active.load();
      } catch (error) {
        if (loadedOnce) throw error;
        active = createMemoryPersistence();
        inMemory = true;
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
  return { persistence, inMemory: () => inMemory };
}

/**
 * The Replica, its sync loop and the tab coordination for one Household.
 * `start` loads the Replica from disk and elects the tab that syncs; the
 * others reload from disk when it writes. A tab whose code is older than
 * the server or another tab reloads by itself when that loses nothing.
 */
export function createFinanceRuntime(options: FinanceRuntimeOptions) {
  const { householdId, readOnly = false } = options;
  const rowShape = options.rowShape ?? REPLICA_ROW_SHAPE;
  const reload = options.reload ?? reloadPage;
  const deletedListeners = new Set<() => void>();
  const { persistence, inMemory } = options.persistence
    ? { persistence: options.persistence, inMemory: () => false }
    : readOnly
      ? { persistence: createMemoryPersistence(), inMemory: () => true }
      : fallbackPersistence(
          typeof indexedDB === "undefined"
            ? null
            : openReplicaDb(householdId, () => {
                for (const listener of deletedListeners) listener();
              }),
        );
  const store = createReplicaStore({ householdId, persistence });
  const loop = createSyncLoop({
    store,
    fetch: options.fetch,
    onUnauthorised: options.onUnauthorised,
    rowShape,
    sendOutbox: !readOnly,
  });
  let loading: Promise<void> | null = null;
  let session = 0;
  let leader = false;
  const cleanups: (() => void)[] = [];
  let requestSync = () => {
    void loop.retryNow();
  };
  let reloading = false;
  let reloadTimer: ReturnType<typeof setTimeout> | undefined;
  function reloadIfSafe() {
    const { problem, newerRowShape } = loop.getStatus();
    if (problem !== "outdated" || newerRowShape === null || reloading) return;
    reloading = true;
    clearTimeout(reloadTimer);
    const current = session;
    reloadForRowShape(store, newerRowShape, {
      storage: () => sessionStorage,
      reload,
      isHidden: () => document.visibilityState === "hidden",
      inMemory,
      now: () => Date.now(),
    })
      .then(({ retryInMs }) => {
        if (retryInMs !== undefined && current === session) {
          reloadTimer = setTimeout(reloadIfSafe, retryInMs);
        }
      })
      .catch((error: unknown) => {
        console.error("Finance reload check failed", error);
      })
      .finally(() => {
        reloading = false;
      });
  }

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
        // A tab that keeps its Replica in memory cannot share it with another
        // tab: it reloads only from its own store, and no other tab can read
        // its Outbox. A name of its own makes the tab sync alone.
        name: inMemory()
          ? `finance-sync-${householdId}-${crypto.randomUUID()}`
          : `finance-sync-${householdId}`,
        rowShape,
        onLeader: () => {
          leader = true;
          loop.start();
        },
        onNewerTab: (newerRowShape) => {
          leader = false;
          loop.stopForNewerTab(newerRowShape);
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
      const onVisibilityChange = () => {
        if (document.visibilityState === "hidden") reloadIfSafe();
      };
      document.addEventListener("visibilitychange", onVisibilityChange);
      cleanups.push(loop.subscribeStatus(reloadIfSafe));
      cleanups.push(() => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        clearTimeout(reloadTimer);
      });
      reloadIfSafe();
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

    /** Gets the newest code, such as after Reload: the same reload that a hidden outdated tab does by itself. */
    reload() {
      void reload();
    },
  };
}

export type FinanceRuntime = ReturnType<typeof createFinanceRuntime>;
