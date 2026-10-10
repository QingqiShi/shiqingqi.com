import "fake-indexeddb/auto";
import { randomUUID } from "node:crypto";
import {
  useIsRestoring,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { render, waitFor } from "#src/testing/test-utils.tsx";
import { createFinanceRuntime } from "../replica/create-finance-runtime.ts";
import { FinanceRuntimeContext } from "../replica/finance-runtime-context.ts";
import { deleteReplicaDb } from "../replica/open-replica-db.ts";
import { FinanceQueryProvider } from "./finance-query-provider.tsx";
import { reportListQuery } from "./report-list-query.ts";
import { reportsPersister } from "./reports-persister.ts";

const PERSIST_THROTTLE_MS = 1000;

function OnRestored({ then }: { then: (client: QueryClient) => void }) {
  const client = useQueryClient();
  const isRestoring = useIsRestoring();
  useEffect(() => {
    if (!isRestoring) then(client);
  }, [isRestoring, client, then]);
  return null;
}

function storedReports(householdId: string) {
  return reportsPersister(householdId).persister.restoreClient();
}

describe("FinanceQueryProvider", () => {
  it("forgets the Reports and stores nothing more when another tab deletes the Replica", async () => {
    const householdId = randomUUID();
    const runtime = createFinanceRuntime({
      householdId,
      onUnauthorised: () => undefined,
      fetch: () => Promise.reject(new Error("No network in tests")),
    });
    await runtime.store.load();
    const restored = Promise.withResolvers<QueryClient>();
    render(
      <FinanceRuntimeContext
        value={{ runtime, householdId, memberId: randomUUID() }}
      >
        <FinanceQueryProvider>
          <OnRestored then={restored.resolve} />
        </FinanceQueryProvider>
      </FinanceRuntimeContext>,
    );
    const client = await restored.promise;
    const list = [
      { id: randomUUID(), periodStart: "2026-09-28", periodEnd: "2026-10-04" },
    ];
    client.setQueryData(reportListQuery.queryKey, list);
    await waitFor(
      async () => {
        expect(await storedReports(householdId)).toBeDefined();
      },
      { timeout: PERSIST_THROTTLE_MS * 3 },
    );

    await deleteReplicaDb(householdId);

    expect(client.getQueryCache().getAll()).toEqual([]);
    client.setQueryData(reportListQuery.queryKey, list);
    await new Promise((resolve) =>
      setTimeout(resolve, PERSIST_THROTTLE_MS * 2),
    );
    expect(await storedReports(householdId)).toBeUndefined();
    runtime.close();
  });
});
