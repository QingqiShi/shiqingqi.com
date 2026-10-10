import type { SyncTableName } from "../sync/row-schemas.ts";
import { emptyReplicaTables } from "./empty-replica-tables.ts";
import { REPLICA_TABLE_NAMES } from "./replica-table-names.ts";
import { rowKey } from "./row-key.ts";
import type {
  OutboxEntry,
  ReplicaMeta,
  ReplicaPersistence,
  ReplicaTables,
  ReplicaWrite,
} from "./types.ts";

/** Raise it when a row shape changes: an upgrade drops every store, and the next sync bootstraps. */
// Older devices keep an unused `reports` store. Do not raise the version to
// remove it: the upgrade also deletes the Outbox.
const DB_VERSION = 1;
const META_STORE = "meta";
const OUTBOX_STORE = "outbox";
const META_KEY = "meta";

export function replicaDbName(householdId: string) {
  return `finance-replica-${householdId}`;
}

const DELETE_BLOCKED_TIMEOUT_MS = 5000;

/**
 * Deletes the Household's Replica database. Close this tab's connection
 * first: a connection in another tab closes on `versionchange`. Rejects when
 * IndexedDB fails, or when a connection still blocks the delete after the
 * timeout.
 */
export function deleteReplicaDb(
  householdId: string,
  blockedTimeoutMs = DELETE_BLOCKED_TIMEOUT_MS,
) {
  return new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const request = indexedDB.deleteDatabase(replicaDbName(householdId));
    request.onsuccess = () => {
      clearTimeout(timer);
      resolve();
    };
    request.onerror = () => {
      clearTimeout(timer);
      reject(
        request.error ?? new Error("The Replica database was not deleted"),
      );
    };
    request.onblocked = () => {
      timer ??= setTimeout(() => {
        reject(new Error("Another connection blocks the Replica delete"));
      }, blockedTimeoutMs);
    };
  });
}

function promisify<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB request failed"));
    };
  });
}

function completion(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error("IndexedDB write failed"));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error("IndexedDB write aborted"));
    };
  });
}

function openDb(name: string, onClose: () => void, onDeleted: () => void) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of [...db.objectStoreNames]) db.deleteObjectStore(store);
      for (const table of REPLICA_TABLE_NAMES) db.createObjectStore(table);
      db.createObjectStore(META_STORE);
      db.createObjectStore(OUTBOX_STORE, {
        keyPath: "mutation.id",
      }).createIndex("seq", "seq");
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = (event) => {
        db.close();
        onClose();
        if (event.newVersion === null) onDeleted();
      };
      db.onclose = onClose;
      resolve(db);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
  });
}

/** The stores a write touches; a write that leaves the outbox alone does not wait for an outbox write. */
function scopeOf(batch: ReplicaWrite) {
  const stores: string[] = [];
  if (batch.clearTables || batch.tables) stores.push(...REPLICA_TABLE_NAMES);
  if (batch.meta) stores.push(META_STORE);
  if (batch.outboxPut?.length || batch.outboxDelete?.length) {
    stores.push(OUTBOX_STORE);
  }
  return stores;
}

function isStoredRow(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function isStoredMeta(value: unknown): value is ReplicaMeta {
  return typeof value === "object" && value !== null && "clientId" in value;
}

function isStoredOutboxEntry(value: unknown): value is OutboxEntry {
  return typeof value === "object" && value !== null && "mutation" in value;
}

type WritableTables = {
  -readonly [Table in keyof ReplicaTables]: ReplicaTables[Table];
};

async function readTable(
  transaction: IDBTransaction,
  table: SyncTableName,
  into: WritableTables,
) {
  const store = transaction.objectStore(table);
  const [keys, values] = await Promise.all([
    promisify(store.getAllKeys()),
    promisify<unknown[]>(store.getAll()),
  ]);
  const map = new Map<string, object>();
  values.forEach((value, index) => {
    const key = keys[index];
    if (typeof key === "string" && isStoredRow(value)) {
      map.set(key, value);
    }
  });
  Object.assign(into, { [table]: map });
}

/**
 * The Replica on disk: one IndexedDB database per Household, one object
 * store per synced table keyed by row key, plus `meta` and the `outbox`.
 * Once the database is open, `write` starts its transaction before it
 * returns, so a write begun just before the page unloads still commits.
 * After `close`, or when something else deletes or upgrades the database
 * (sign-out or a new version in another tab, cleared site data), every later
 * call fails: the database is never opened again, so a write can not claim
 * rows that are gone. `onDeleted` runs when something else deletes the
 * database, such as sign-out in another tab.
 */
export function openReplicaDb(
  householdId: string,
  onDeleted: () => void = () => undefined,
): ReplicaPersistence {
  let dbPromise: Promise<IDBDatabase> | null = null;
  let opened: IDBDatabase | null = null;
  let lost: Error | null = null;
  const forget = () => {
    dbPromise = null;
    opened = null;
  };
  const onLost = () => {
    lost ??= new Error("The Replica database was closed from outside");
    forget();
  };
  const db = () => {
    if (lost) return Promise.reject(lost);
    if (dbPromise) return dbPromise;
    const opening = openDb(replicaDbName(householdId), onLost, onDeleted).then(
      (handle) => {
        if (dbPromise === opening) opened = handle;
        return handle;
      },
      (error: unknown) => {
        if (dbPromise === opening) dbPromise = null;
        throw error;
      },
    );
    dbPromise = opening;
    return opening;
  };

  return {
    async load() {
      const handle = await db();
      const transaction = handle.transaction(
        [...REPLICA_TABLE_NAMES, META_STORE, OUTBOX_STORE],
        "readonly",
      );
      const tables: WritableTables = emptyReplicaTables();
      const [metaValue, outboxValues] = await Promise.all([
        promisify<unknown>(transaction.objectStore(META_STORE).get(META_KEY)),
        promisify<unknown[]>(transaction.objectStore(OUTBOX_STORE).getAll()),
        ...REPLICA_TABLE_NAMES.map((table) =>
          readTable(transaction, table, tables),
        ),
      ]);
      return {
        meta: isStoredMeta(metaValue) ? metaValue : null,
        tables,
        outbox: outboxValues.filter(isStoredOutboxEntry),
      };
    },

    async loadOutbox() {
      const handle = await db();
      const values = await promisify<unknown[]>(
        handle
          .transaction(OUTBOX_STORE, "readonly")
          .objectStore(OUTBOX_STORE)
          .getAll(),
      );
      return values.filter(isStoredOutboxEntry);
    },

    async write(batch) {
      const stores = scopeOf(batch);
      if (stores.length === 0) return;
      if (lost) throw lost;
      const handle = opened ?? (await db());
      const transaction = handle.transaction(stores, "readwrite", {
        durability: stores.includes(OUTBOX_STORE) ? "strict" : "default",
      });
      const done = completion(transaction);
      if (batch.clearTables) {
        for (const table of REPLICA_TABLE_NAMES) {
          transaction.objectStore(table).clear();
        }
      }
      for (const table of REPLICA_TABLE_NAMES) {
        const writes = batch.tables?.[table];
        if (!writes) continue;
        const store = transaction.objectStore(table);
        for (const key of writes.delete) store.delete(key);
        for (const row of writes.put) store.put(row, rowKey(table, row));
      }
      if (batch.meta) {
        transaction.objectStore(META_STORE).put(batch.meta, META_KEY);
      }
      if (stores.includes(OUTBOX_STORE)) {
        const outbox = transaction.objectStore(OUTBOX_STORE);
        for (const entry of batch.outboxPut ?? []) outbox.put(entry);
        for (const id of batch.outboxDelete ?? []) outbox.delete(id);
      }
      transaction.commit();
      await done;
    },

    close() {
      lost ??= new Error("The Replica database is closed");
      if (opened) opened.close();
      else
        void dbPromise?.then((handle) => {
          handle.close();
        });
      forget();
    },
  };
}
