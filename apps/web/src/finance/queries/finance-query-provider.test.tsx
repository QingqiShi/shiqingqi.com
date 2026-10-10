import "fake-indexeddb/auto";
import { randomUUID } from "node:crypto";
import {
  QueryClient,
  useIsRestoring,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { persistQueryClientSave } from "@tanstack/react-query-persist-client";
import { useEffect, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "#src/testing/test-utils.tsx";
import { createFinanceRuntime } from "../replica/create-finance-runtime.ts";
import { FinanceRuntimeContext } from "../replica/finance-runtime-context.ts";
import { deleteReplicaDb } from "../replica/open-replica-db.ts";
import type {
  ReportListItem,
  WeeklyReportResponse,
} from "../reports/report-api-schemas.ts";
import { useReportList } from "../reports/use-report-list.ts";
import { WEEKLY_REPORT_SCHEMA_VERSION } from "../reports/weekly-report-data-schema.ts";
import { FinanceQueryProvider } from "./finance-query-provider.tsx";
import { reportListQuery } from "./report-list-query.ts";
import { reportQuery } from "./report-query.ts";
import {
  reportsPersister,
  shouldPersistReportsQuery,
} from "./reports-persister.ts";

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

afterEach(() => {
  vi.unstubAllGlobals();
});

async function renderProvider(householdId: string, children: ReactNode) {
  const runtime = createFinanceRuntime({
    householdId,
    onUnauthorised: () => undefined,
    fetch: () => Promise.reject(new Error("No network in tests")),
  });
  await runtime.store.load();
  render(
    <FinanceRuntimeContext
      value={{ runtime, householdId, memberId: randomUUID() }}
    >
      <FinanceQueryProvider>{children}</FinanceQueryProvider>
    </FinanceRuntimeContext>,
  );
  return runtime;
}

function report(
  item: ReportListItem,
  netWorthMinor: number,
): WeeklyReportResponse {
  const comparison = { day: item.periodEnd, netWorthMinor, changeMinor: 0 };
  const noSpending = { totalMinor: 0, averageMinor: 0, changeMinor: 0 };
  return {
    ...item,
    data: {
      schemaVersion: WEEKLY_REPORT_SCHEMA_VERSION,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      baseCurrency: "GBP",
      balanceSheet: {
        assets: { totalMinor: netWorthMinor, groups: [] },
        liabilities: { totalMinor: 0, groups: [] },
        netWorthMinor,
      },
      comparisons: {
        previousWeek: comparison,
        fourWeeksAgo: comparison,
        yearStart: comparison,
      },
      groupNets: [],
      propertyNetMinor: null,
      spending: { ...noSpending, byCategory: [], byMember: [] },
      incomeMinor: 0,
      topPayees: [],
      transactionCount: 0,
      reviewCount: 0,
      trend: [],
    },
  };
}

function ReportNetWorth({ id }: { id: string }) {
  useReportList();
  const { data } = useQuery(reportQuery(id));
  return <p>Net worth {data?.data.balanceSheet.netWorthMinor}</p>;
}

describe("FinanceQueryProvider", () => {
  it("reads a stored Report again when the list shows the server wrote it again", async () => {
    const householdId = randomUUID();
    const stored = (periodEnd: string): ReportListItem => ({
      id: randomUUID(),
      periodStart: periodEnd,
      periodEnd,
      generatedAt: "2026-10-05T06:00:00.000Z",
    });
    const opened = stored("2026-10-04");
    const older = stored("2026-09-27");
    const previous = new QueryClient();
    previous.setQueryData(reportListQuery.queryKey, [opened, older]);
    previous.setQueryData(reportQuery(opened.id).queryKey, report(opened, 100));
    previous.setQueryData(reportQuery(older.id).queryKey, report(older, 100));
    await persistQueryClientSave({
      queryClient: previous,
      persister: reportsPersister(householdId).persister,
      buster: String(WEEKLY_REPORT_SCHEMA_VERSION),
      dehydrateOptions: {
        shouldDehydrateQuery: (query) =>
          shouldPersistReportsQuery(previous, query),
      },
    });
    await waitFor(
      async () => {
        expect(await storedReports(householdId)).toBeDefined();
      },
      { timeout: PERSIST_THROTTLE_MS * 3 },
    );
    const rewritten = [opened, older].map((item) => ({
      ...item,
      generatedAt: "2026-10-11T09:00:00.000Z",
    }));
    vi.stubGlobal("fetch", (input: string) => {
      const { pathname } = new URL(input, "http://localhost");
      const item = rewritten.find((row) => pathname.endsWith(row.id));
      const body =
        item === undefined ? { reports: rewritten } : report(item, 200);
      return Promise.resolve(new Response(JSON.stringify(body)));
    });
    const restored = Promise.withResolvers<QueryClient>();

    const runtime = await renderProvider(
      householdId,
      <>
        <OnRestored then={restored.resolve} />
        <ReportNetWorth id={opened.id} />
      </>,
    );

    expect(await screen.findByText("Net worth 200")).toBeVisible();
    const client = await restored.promise;
    expect(client.getQueryState(reportQuery(older.id).queryKey)).toMatchObject({
      isInvalidated: true,
    });
    runtime.close();
  });

  it("forgets the Reports and stores nothing more when another tab deletes the Replica", async () => {
    const householdId = randomUUID();
    const restored = Promise.withResolvers<QueryClient>();
    const runtime = await renderProvider(
      householdId,
      <OnRestored then={restored.resolve} />,
    );
    const client = await restored.promise;
    const list: ReportListItem[] = [
      {
        id: randomUUID(),
        periodStart: "2026-09-28",
        periodEnd: "2026-10-04",
        generatedAt: "2026-10-05T06:00:00.000Z",
      },
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
