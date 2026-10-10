import "fake-indexeddb/auto";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { HouseholdRow } from "../sync/row-schemas.ts";
import { createMemoryPersistence } from "./create-memory-persistence.ts";
import { createReplicaStore } from "./create-replica-store.ts";
import { createSyncLoop } from "./create-sync-loop.ts";
import { guardUnsavedOutbox } from "./guard-unsaved-outbox.ts";
import { openReplicaDb, replicaDbName } from "./open-replica-db.ts";
import type { ReplicaPersistence } from "./types.ts";

const NOW = "2026-10-10T09:00:00.000Z";

function household(id: string, clock: number): HouseholdRow {
  return {
    id,
    name: "Home",
    baseCurrency: "GBP",
    timezone: "Europe/London",
    clock,
  };
}

async function openStore(
  householdId: string,
  persistence: ReplicaPersistence = openReplicaDb(householdId),
) {
  const store = createReplicaStore({
    householdId,
    persistence,
    now: () => new Date(NOW),
  });
  await store.load();
  return store;
}

async function bootstrappedStore(householdId: string) {
  const store = await openStore(householdId);
  store.startBootstrap({
    household: household(householdId, 1),
    transactionsFrom: null,
  });
  store.finishBootstrap(1, new Set());
  await store.flush();
  return store;
}

function renameTag(id: string, name: string) {
  return { name: "upsertTag" as const, args: { id, name } };
}

/** A persistence whose writes fail while `failing` is set. */
function flakyPersistence() {
  const inner = createMemoryPersistence();
  const control = { failing: false };
  const persistence: ReplicaPersistence = {
    ...inner,
    write: (batch) =>
      control.failing
        ? Promise.reject(new Error("QuotaExceededError"))
        : inner.write(batch),
  };
  return { persistence, control };
}

describe("the Outbox on disk", () => {
  it("keeps a mutation when the page goes away in the same task", async () => {
    const householdId = randomUUID();
    const tab = await bootstrappedStore(householdId);
    const tagId = randomUUID();

    const mutation = tab.applyLocal(renameTag(tagId, "Rail"));
    tab.close();

    const reloaded = await openStore(householdId);
    expect(reloaded.getSnapshot().outboxCount).toBe(1);
    expect(reloaded.takeOutbox()).toEqual([mutation]);
    expect(reloaded.getSnapshot().tables.tags.get(tagId)?.name).toBe("Rail");
    reloaded.close();
  });

  it("keeps the order of mutations made in quick succession", async () => {
    const householdId = randomUUID();
    const tab = await bootstrappedStore(householdId);
    const tagId = randomUUID();

    const names = Array.from(
      { length: 20 },
      (_, index) => `Tag ${String(index)}`,
    );
    const ids = names.map((name) => tab.applyLocal(renameTag(tagId, name)).id);
    tab.close();

    const reloaded = await openStore(householdId);
    expect(reloaded.takeOutbox().map((mutation) => mutation.id)).toEqual(ids);
    expect(reloaded.getSnapshot().tables.tags.get(tagId)?.name).toBe("Tag 19");
    reloaded.close();
  });

  it("keeps a mutation the server applied in the view after a reload, until a pull confirms it", async () => {
    const householdId = randomUUID();
    const tab = await bootstrappedStore(householdId);
    const tagId = randomUUID();
    const mutation = tab.applyLocal(renameTag(tagId, "Rail"));
    tab.takeOutbox();
    tab.acknowledge([mutation.id], {
      applied: [mutation.id],
      rejected: [],
      clock: 2,
    });
    tab.close();

    const reloaded = await openStore(householdId);
    expect(reloaded.getSnapshot().outboxCount).toBe(0);
    expect(reloaded.hasQueued()).toBe(false);
    expect(reloaded.getSnapshot().tables.tags.get(tagId)?.name).toBe("Rail");
    expect(reloaded.awaitingIds()).toEqual(new Set([mutation.id]));

    reloaded.applyPull(
      {
        clock: 2,
        household: household(householdId, 2),
        tables: {
          tags: [
            {
              id: tagId,
              householdId,
              name: "Rail",
              position: 0,
              version: 1,
              createdAt: NOW,
              updatedAt: NOW,
              deletedAt: null,
            },
          ],
        },
      },
      reloaded.awaitingIds(),
    );
    await reloaded.flush();
    reloaded.close();

    const confirmed = await openStore(householdId);
    expect(confirmed.awaitingIds().size).toBe(0);
    expect(confirmed.getSnapshot().pendingKeys.size).toBe(0);
    expect(confirmed.getSnapshot().tables.tags.get(tagId)?.name).toBe("Rail");
    confirmed.close();
  });

  it("hands a mutation from a tab that does not sync to the one that does", async () => {
    const householdId = randomUUID();
    const leader = await bootstrappedStore(householdId);
    const follower = await openStore(householdId);

    const mutation = follower.applyLocal(renameTag(randomUUID(), "Rail"));
    follower.close();

    await leader.mergeOutboxFromDisk();
    expect(leader.takeOutbox()).toEqual([mutation]);
    leader.close();
  });

  it("shows a failed write in the sync status and guards the unload until a write works", async () => {
    const { persistence, control } = flakyPersistence();
    const store = await openStore(randomUUID(), persistence);
    const loop = createSyncLoop({ store });
    const release = guardUnsavedOutbox(store, loop);
    const unloadPrevented = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    control.failing = true;
    store.applyLocal(renameTag(randomUUID(), "Rail"));
    expect(unloadPrevented()).toBe(true);
    await store.flush();
    expect(store.getStorageState()).toEqual({ unsaved: 1, failed: true });
    expect(loop.getStatus().problem).toBe("storage");
    expect(unloadPrevented()).toBe(true);

    control.failing = false;
    await store.flush();
    expect(store.getStorageState()).toEqual({ unsaved: 0, failed: false });
    expect(loop.getStatus().problem).toBeNull();
    expect(unloadPrevented()).toBe(false);
    expect(
      (await persistence.loadOutbox()).map((entry) => entry.mutation.name),
    ).toEqual(["upsertTag"]);
    release();
  });

  it("keeps the view and shows a storage problem when something else deletes the database", async () => {
    const householdId = randomUUID();
    const tab = await bootstrappedStore(householdId);
    const tagId = randomUUID();
    tab.applyLocal(renameTag(tagId, "Rail"));
    await tab.flush();

    await new Promise<void>((resolve) => {
      indexedDB.deleteDatabase(replicaDbName(householdId)).onsuccess = () => {
        resolve();
      };
    });
    await tab.reload();
    tab.requireBootstrap();
    await tab.flush();

    expect(tab.getSnapshot().bootstrapped).toBe(true);
    expect(tab.getSnapshot().tables.tags.get(tagId)?.name).toBe("Rail");
    expect(tab.getStorageState().failed).toBe(true);
    const fresh = await openStore(householdId);
    expect(fresh.getMeta().bootstrapped).toBe(false);
    expect(fresh.getSnapshot().outboxCount).toBe(0);
    fresh.close();
  });
});
