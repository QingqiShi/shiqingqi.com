import "fake-indexeddb/auto";
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { openReplicaDb, replicaDbName } from "./open-replica-db.ts";
import type { OutboxEntry, ReplicaMeta } from "./types.ts";

const householdId = randomUUID();

const meta: ReplicaMeta = {
  householdId,
  clientId: randomUUID(),
  clock: 4,
  bootstrapped: true,
  household: null,
  transactionsFrom: null,
  lastSyncedAt: null,
};

const tag = {
  id: randomUUID(),
  householdId,
  name: "Train",
  position: 0,
  version: 1,
  createdAt: "2026-10-10T09:00:00.000Z",
  updatedAt: "2026-10-10T09:00:00.000Z",
  deletedAt: null,
};

const link = {
  transactionId: randomUUID(),
  tagId: tag.id,
  householdId,
  version: 1,
  deletedAt: null,
};

const entry: OutboxEntry = {
  mutation: {
    id: randomUUID(),
    name: "upsertTag",
    args: { id: tag.id, name: "Rail" },
  },
  seq: 1,
  createdAt: "2026-10-10T09:00:00.000Z",
};

describe("openReplicaDb", () => {
  it("stores rows by key, the meta and the outbox, and clears tables but not the outbox", async () => {
    const db = openReplicaDb(householdId);
    await db.write({
      meta,
      tables: {
        tags: { put: [tag], delete: [] },
        transactionTags: { put: [link], delete: [] },
      },
      outboxPut: [entry],
    });

    const reopened = openReplicaDb(householdId);
    const loaded = await reopened.load();
    expect(loaded.meta).toEqual(meta);
    expect(loaded.tables.tags.get(tag.id)).toEqual(tag);
    expect(
      loaded.tables.transactionTags.get(`${link.transactionId}|${tag.id}`),
    ).toEqual(link);
    expect(loaded.outbox).toEqual([entry]);

    await reopened.write({
      clearTables: true,
      tables: { tags: { put: [], delete: [tag.id] } },
      outboxDelete: [],
    });
    const cleared = await reopened.load();
    expect(cleared.tables.tags.size).toBe(0);
    expect(cleared.tables.transactionTags.size).toBe(0);
    expect(await reopened.loadOutbox()).toEqual([entry]);

    await reopened.write({ outboxDelete: [entry.mutation.id] });
    expect(await reopened.loadOutbox()).toEqual([]);
    db.close();
    reopened.close();
  });

  it("never opens a database again that something else deleted, and says it was deleted", async () => {
    const id = randomUUID();
    const onDeleted = vi.fn();
    const db = openReplicaDb(id, onDeleted);
    await db.write({ meta: { ...meta, householdId: id } });

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(replicaDbName(id));
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error ?? new Error("delete failed"));
      };
    });

    await expect(
      db.write({ meta: { ...meta, householdId: id } }),
    ).rejects.toThrow();
    await expect(db.load()).rejects.toThrow();
    expect(onDeleted).toHaveBeenCalledOnce();
    const fresh = openReplicaDb(id);
    expect((await fresh.load()).meta).toBeNull();
    fresh.close();
  });

  it("does not say it was deleted when a newer version upgrades it", async () => {
    const id = randomUUID();
    const onDeleted = vi.fn();
    const db = openReplicaDb(id, onDeleted);
    await db.write({ meta: { ...meta, householdId: id } });

    const upgraded = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(replicaDbName(id), 2);
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error ?? new Error("upgrade failed"));
      };
    });

    await expect(db.load()).rejects.toThrow();
    expect(onDeleted).not.toHaveBeenCalled();
    upgraded.close();
  });
});
