import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createMemoryPersistence } from "./create-memory-persistence.ts";
import { createReplicaStore } from "./create-replica-store.ts";
import { reloadForRowShape } from "./reload-for-row-shape.ts";
import type { ReplicaPersistence } from "./types.ts";

function createTab(
  options: {
    writeFails?: () => boolean;
    storage?: () => Pick<Storage, "getItem" | "setItem">;
  } = {},
) {
  const values = new Map<string, string>();
  const memory = createMemoryPersistence();
  const persistence: ReplicaPersistence = {
    ...memory,
    write: async (batch) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (options.writeFails?.()) throw new Error("The disk is full");
      await memory.write(batch);
    },
  };
  const store = createReplicaStore({ householdId: randomUUID(), persistence });
  const outboxAtReload: number[] = [];
  let hidden = true;
  let inMemory = false;
  let now = 0;
  let whileUpdating: () => void = () => undefined;
  const dependencies = {
    storage:
      options.storage ??
      (() => ({
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value);
        },
      })),
    reload: async (confirm: () => boolean) => {
      whileUpdating();
      if (!confirm()) return false;
      outboxAtReload.push((await persistence.loadOutbox()).length);
      return true;
    },
    isHidden: () => hidden,
    inMemory: () => inMemory,
    now: () => now,
  };
  return {
    store,
    dependencies,
    outboxAtReload,
    setHidden(value: boolean) {
      hidden = value;
    },
    setInMemory(value: boolean) {
      inMemory = value;
    },
    setNow(value: number) {
      now = value;
    },
    whileUpdating(callback: () => void) {
      whileUpdating = callback;
    },
    reloads: (rowShape: number) =>
      reloadForRowShape(store, rowShape, dependencies).then(
        (outcome) => outcome.reloaded,
      ),
    addTag() {
      store.applyLocal({
        name: "upsertTag",
        args: { id: randomUUID(), name: "Trip", position: 0 },
      });
    },
  };
}

describe("reloadForRowShape", () => {
  it("reloads a hidden tab up to 3 times per row shape, with a longer gap each time", async () => {
    const tab = createTab();
    await tab.store.load();
    const attempt = async (rowShape: number, at: number) => {
      tab.setNow(at);
      return reloadForRowShape(tab.store, rowShape, tab.dependencies);
    };

    expect([
      await attempt(8, 0),
      await attempt(8, 0),
      await attempt(8, 30_000),
      await attempt(8, 30_000),
      await attempt(8, 150_000),
      await attempt(8, 1_000_000_000),
      await attempt(9, 1_000_000_000),
      await attempt(8, 2_000_000_000),
    ]).toEqual([
      { reloaded: true },
      { reloaded: false, retryInMs: 30_000 },
      { reloaded: true },
      { reloaded: false, retryInMs: 120_000 },
      { reloaded: true },
      { reloaded: false },
      { reloaded: true },
      { reloaded: false },
    ]);
  });

  it("reloads only after the Outbox is on disk", async () => {
    const tab = createTab();
    await tab.store.load();
    tab.addTag();

    expect(await tab.reloads(8)).toBe(true);
    expect(tab.outboxAtReload).toEqual([1]);
  });

  it("does not reload a visible tab, where the visitor can be in the middle of an edit", async () => {
    const tab = createTab();
    await tab.store.load();
    tab.setHidden(false);

    expect(await tab.reloads(8)).toBe(false);
    tab.setHidden(true);
    expect(await tab.reloads(8)).toBe(true);
  });

  it("does not reload while the Replica is only in memory", async () => {
    const tab = createTab();
    await tab.store.load();
    tab.setInMemory(true);

    expect(await tab.reloads(8)).toBe(false);
    expect(tab.outboxAtReload).toEqual([]);
  });
});
