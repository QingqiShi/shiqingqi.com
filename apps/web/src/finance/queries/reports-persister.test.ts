import "fake-indexeddb/auto";
import { randomUUID } from "node:crypto";
import { QueryClient } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from "@tanstack/react-query-persist-client";
import { describe, expect, it } from "vitest";
import type { ReportListItem } from "../reports/report-api-schemas.ts";
import { reportListQuery } from "./report-list-query.ts";
import {
  reportsPersister,
  shouldPersistReportsQuery,
} from "./reports-persister.ts";

function listItem(periodEnd: string): ReportListItem {
  return { id: randomUUID(), periodStart: periodEnd, periodEnd };
}

function save(queryClient: QueryClient, householdId: string) {
  return persistQueryClientSave({
    queryClient,
    persister: reportsPersister(householdId).persister,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        shouldPersistReportsQuery(queryClient, query),
    },
  });
}

async function restore(householdId: string) {
  const queryClient = new QueryClient();
  await persistQueryClientRestore({
    queryClient,
    persister: reportsPersister(householdId).persister,
  });
  return queryClient;
}

describe("the Reports persister", () => {
  it("keeps the list and the Reports in it, for one Household only", async () => {
    const householdId = randomUUID();
    const kept = listItem("2026-10-04");
    const deleted = listItem("2026-09-27");
    const client = new QueryClient();
    client.setQueryData(reportListQuery.queryKey, [kept]);
    client.setQueryData(["finance", "report", kept.id], { report: kept.id });
    client.setQueryData(["finance", "report", deleted.id], { stale: true });
    client.setQueryData(["finance", "report-image", kept.id], "png");

    await save(client, householdId);

    const restored = await restore(householdId);
    expect(restored.getQueryData(reportListQuery.queryKey)).toEqual([kept]);
    expect(restored.getQueryData(["finance", "report", kept.id])).toEqual({
      report: kept.id,
    });
    expect(
      restored.getQueryData(["finance", "report", deleted.id]),
    ).toBeUndefined();
    expect(
      restored.getQueryData(["finance", "report-image", kept.id]),
    ).toBeUndefined();
    const other = await restore(randomUUID());
    expect(other.getQueryData(reportListQuery.queryKey)).toBeUndefined();
  });

  it("deletes the stored Reports on clear and writes nothing after it", async () => {
    const householdId = randomUUID();
    const client = new QueryClient();
    client.setQueryData(reportListQuery.queryKey, [listItem("2026-10-04")]);
    const { persister, clear } = reportsPersister(householdId);
    await save(client, householdId);

    await clear();
    await persister.persistClient({
      buster: "",
      timestamp: Date.now(),
      clientState: { queries: [], mutations: [] },
    });

    expect(await persister.restoreClient()).toBeUndefined();
    const restored = await restore(householdId);
    expect(restored.getQueryData(reportListQuery.queryKey)).toBeUndefined();
  });
});
