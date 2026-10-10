import "fake-indexeddb/auto";
import { randomUUID } from "node:crypto";
import { QueryClient } from "@tanstack/react-query";
import { persistQueryClientSave } from "@tanstack/react-query-persist-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reportListQuery } from "../queries/report-list-query.ts";
import { reportsPersister } from "../queries/reports-persister.ts";
import {
  deleteReplicaDb,
  openReplicaDb,
  replicaDbName,
} from "../replica/open-replica-db.ts";
import { clearHouseholdFromDevice } from "./clear-household-from-device.ts";

async function databaseNames() {
  return (await indexedDB.databases()).map((database) => database.name);
}

async function storeReplica(householdId: string) {
  const replica = openReplicaDb(householdId);
  await replica.write({ outboxDelete: ["nothing"] });
  return replica;
}

async function storeReports(householdId: string) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(reportListQuery.queryKey, []);
  await persistQueryClientSave({
    queryClient,
    persister: reportsPersister(householdId).persister,
  });
}

/** Opens the Replica database the way an old tab does: it does not close on `versionchange`. */
function openStubbornConnection(householdId: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(replicaDbName(householdId));
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("open failed"));
    };
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("clearHouseholdFromDevice", () => {
  it("closes this tab's Replica, then deletes the Household's Replica and stored Reports only", async () => {
    const householdId = randomUUID();
    const otherId = randomUUID();
    const replica = await storeReplica(householdId);
    await storeReports(householdId);
    await storeReports(otherId);

    await clearHouseholdFromDevice(householdId, replica);

    expect(await databaseNames()).not.toContain(replicaDbName(householdId));
    await expect(replica.loadOutbox()).rejects.toThrow("closed");
    await expect(
      reportsPersister(householdId).persister.restoreClient(),
    ).resolves.toBeUndefined();
    await expect(
      reportsPersister(otherId).persister.restoreClient(),
    ).resolves.toBeDefined();
  });

  it("rejects when one copy is not deleted, after it deleted the others", async () => {
    const householdId = randomUUID();
    const replica = await storeReplica(householdId);
    await storeReports(householdId);
    vi.stubGlobal("caches", {
      delete: () => Promise.reject(new Error("The cache is not deleted")),
    });

    await expect(
      clearHouseholdFromDevice(householdId, replica),
    ).rejects.toThrow("Household data remains on this device");
    expect(await databaseNames()).not.toContain(replicaDbName(householdId));
    await expect(
      reportsPersister(householdId).persister.restoreClient(),
    ).resolves.toBeUndefined();
  });
});

describe("deleteReplicaDb", () => {
  it("waits while another connection blocks the delete, and resolves when it closes", async () => {
    const householdId = randomUUID();
    (await storeReplica(householdId)).close();
    const stubborn = await openStubbornConnection(householdId);

    const deleting = deleteReplicaDb(householdId);
    await new Promise((resolve) => setTimeout(resolve, 20));
    stubborn.close();

    await expect(deleting).resolves.toBeUndefined();
    expect(await databaseNames()).not.toContain(replicaDbName(householdId));
  });

  it("rejects when another connection still blocks the delete after the timeout", async () => {
    const householdId = randomUUID();
    (await storeReplica(householdId)).close();
    const stubborn = await openStubbornConnection(householdId);

    await expect(deleteReplicaDb(householdId, 20)).rejects.toThrow(
      "Another connection blocks the Replica delete",
    );
    stubborn.close();
  });

  it("rejects when IndexedDB fails the delete", async () => {
    const deleteDatabase = indexedDB.deleteDatabase.bind(indexedDB);
    const captured: { request?: IDBOpenDBRequest } = {};
    vi.spyOn(indexedDB, "deleteDatabase").mockImplementationOnce((name) => {
      captured.request = deleteDatabase(name);
      return captured.request;
    });

    const deleting = deleteReplicaDb(randomUUID());
    const failed = captured.request;
    if (!failed) throw new Error("No delete request");
    Object.defineProperty(failed, "readyState", { value: "done" });
    Object.defineProperty(failed, "error", {
      value: new DOMException("Disk failed", "UnknownError"),
    });
    failed.onerror?.call(failed, new Event("error"));

    await expect(deleting).rejects.toThrow("Disk failed");
  });
});
