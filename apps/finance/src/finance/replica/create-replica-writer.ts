import type {
  OutboxEntry,
  ReplicaPersistence,
  ReplicaStorageState,
  ReplicaWrite,
} from "./types.ts";

export function createReplicaWriter(
  persistence: ReplicaPersistence,
  onExchangeRateCursorWritten: (cursor: string) => void,
) {
  /** The rate cursor of the rates on disk: what the meta on disk may claim. */
  let cursorOnDisk: string | null = null;
  /** The Outbox entry each mutation must have on disk (null: none) where the write has not committed. */
  const unsaved = new Map<string, OutboxEntry | null>();
  /** Outbox writes running now, per mutation. */
  const saving = new Map<string, number>();
  /** Mutations whose last Outbox write failed. */
  const failedSaves = new Set<string>();
  const outboxWrites = new Set<Promise<void>>();
  /** The last write of server rows failed. */
  let rowsFailed = false;
  /** A write of server rows failed, so the clock on disk must not claim the rows after it. */
  let rowsBehind = false;
  let storageState: ReplicaStorageState = { unsaved: 0, failed: false };
  /** Counts the writes that other tabs must read. A pull that changes nothing does not count. */
  let diskRevision = 0;
  const storageListeners = new Set<() => void>();
  let writes: Promise<void> = Promise.resolve();

  function updateStorageState() {
    let count = 0;
    for (const wanted of unsaved.values()) {
      if (wanted && !wanted.acknowledged) count++;
    }
    let failed = rowsFailed;
    for (const id of failedSaves) {
      if (unsaved.has(id)) failed = true;
      else failedSaves.delete(id);
    }
    if (count === storageState.unsaved && failed === storageState.failed) {
      return;
    }
    storageState = { unsaved: count, failed };
    for (const listener of storageListeners) listener();
  }

  /**
   * Writes server rows and the meta, one batch after another; these can
   * wait. The meta on disk keeps the rate cursor of the rates on disk, or
   * `exchangeRateCursor` when the batch writes the rates it reaches.
   */
  function persist(
    batch: ReplicaWrite,
    {
      startsOver = false,
      forOtherTabs = true,
      exchangeRateCursor,
    }: {
      startsOver?: boolean;
      forOtherTabs?: boolean;
      exchangeRateCursor?: string;
    } = {},
  ) {
    if (forOtherTabs) diskRevision++;
    writes = writes
      .then(() => {
        if (startsOver) rowsBehind = false;
        return persistence.write(
          batch.meta
            ? {
                ...batch,
                meta: {
                  ...batch.meta,
                  clock: rowsBehind ? 0 : batch.meta.clock,
                  exchangeRateCursor: exchangeRateCursor ?? cursorOnDisk,
                },
              }
            : batch,
        );
      })
      .then(
        () => {
          rowsFailed = false;
          if (exchangeRateCursor === undefined) return;
          cursorOnDisk = exchangeRateCursor;
          onExchangeRateCursorWritten(exchangeRateCursor);
        },
        () => {
          rowsBehind = true;
          rowsFailed = true;
        },
      )
      .finally(updateStorageState);
    return writes;
  }

  /**
   * Starts the Outbox write for `ids` in this task, with no wait behind
   * other writes: the page can unload at any moment. IndexedDB runs
   * transactions on the same store in the order they start, so the
   * writes stay in order. Never rejects.
   */
  function saveOutbox(ids: Iterable<string>): Promise<void> {
    const written = new Map<string, OutboxEntry | null>();
    for (const id of ids) {
      const wanted = unsaved.get(id);
      if (wanted !== undefined) written.set(id, wanted);
    }
    if (written.size === 0) return Promise.resolve();
    diskRevision++;
    const outboxPut: OutboxEntry[] = [];
    const outboxDelete: string[] = [];
    for (const [id, wanted] of written) {
      if (wanted) outboxPut.push(wanted);
      else outboxDelete.push(id);
      saving.set(id, (saving.get(id) ?? 0) + 1);
    }
    const write = new Promise<void>((resolve, reject) => {
      persistence.write({ outboxPut, outboxDelete }).then(resolve, reject);
    })
      .then(
        () => {
          for (const [id, wanted] of written) {
            failedSaves.delete(id);
            if (unsaved.get(id) === wanted) unsaved.delete(id);
          }
        },
        () => {
          for (const id of written.keys()) failedSaves.add(id);
        },
      )
      .finally(() => {
        for (const id of written.keys()) {
          const count = (saving.get(id) ?? 1) - 1;
          if (count > 0) saving.set(id, count);
          else saving.delete(id);
        }
        outboxWrites.delete(write);
        updateStorageState();
      });
    outboxWrites.add(write);
    updateStorageState();
    return write;
  }

  /** Writes every Outbox change that is not on disk and has no write running. */
  function saveUnsavedOutbox() {
    return saveOutbox([...unsaved.keys()].filter((id) => !saving.has(id)));
  }

  /** Marks Outbox entries for removal from disk. */
  function forgetOutbox(ids: readonly string[]) {
    for (const id of ids) unsaved.set(id, null);
    return saveOutbox(ids);
  }

  return {
    persist,
    saveOutbox,
    saveUnsavedOutbox,
    forgetOutbox,

    markUnsaved(id: string, wanted: OutboxEntry | null) {
      unsaved.set(id, wanted);
    },

    unsavedOutbox(): ReadonlyMap<string, OutboxEntry | null> {
      return unsaved;
    },

    setCursorOnDisk(cursor: string | null) {
      cursorOnDisk = cursor;
    },

    markRowsFailed() {
      rowsFailed = true;
      updateStorageState();
    },

    /** Moves when this tab writes something other tabs must read, so they reload only then. */
    getDiskRevision: () => {
      return diskRevision;
    },

    getStorageState: (): ReplicaStorageState => {
      return storageState;
    },

    subscribeStorage: (listener: () => void) => {
      storageListeners.add(listener);
      return () => {
        storageListeners.delete(listener);
      };
    },

    /** Tries the failed Outbox writes again and resolves when every write so far has settled. */
    flush: async () => {
      void saveUnsavedOutbox();
      await Promise.all([writes, ...outboxWrites]);
    },
  };
}

export type ReplicaWriter = ReturnType<typeof createReplicaWriter>;
