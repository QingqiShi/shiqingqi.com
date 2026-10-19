import "fake-indexeddb/auto";
import { randomUUID } from "node:crypto";
import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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

function OnMount({ then }: { then: (client: QueryClient) => void }) {
  const client = useQueryClient();
  useEffect(() => {
    then(client);
  }, [client, then]);
  return null;
}

function databaseNames() {
  return indexedDB.databases().then((list) => list.map(({ name }) => name));
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
      spending: { ...noSpending, byCategory: [], byMember: [], history: [] },
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
  it("reads a Report again when the list shows the server wrote it again", async () => {
    const householdId = randomUUID();
    const item: ReportListItem = {
      id: randomUUID(),
      periodStart: "2026-09-28",
      periodEnd: "2026-10-04",
      generatedAt: "2026-10-05T06:00:00.000Z",
    };
    const served = { item, netWorthMinor: 100 };
    vi.stubGlobal("fetch", (input: string) => {
      const { pathname } = new URL(input, "http://localhost");
      const body = pathname.endsWith(item.id)
        ? report(served.item, served.netWorthMinor)
        : { reports: [served.item] };
      return Promise.resolve(new Response(JSON.stringify(body)));
    });
    const mounted = Promise.withResolvers<QueryClient>();
    const runtime = await renderProvider(
      householdId,
      <>
        <OnMount then={mounted.resolve} />
        <ReportNetWorth id={item.id} />
      </>,
    );
    expect(await screen.findByText("Net worth 100")).toBeVisible();
    const client = await mounted.promise;

    served.item = { ...item, generatedAt: "2026-10-11T09:00:00.000Z" };
    served.netWorthMinor = 200;
    await client.refetchQueries({ queryKey: reportListQuery.queryKey });

    expect(await screen.findByText("Net worth 200")).toBeVisible();
    runtime.close();
  });

  it("forgets the Reports when another tab deletes the Replica", async () => {
    const householdId = randomUUID();
    const mounted = Promise.withResolvers<QueryClient>();
    const runtime = await renderProvider(
      householdId,
      <OnMount then={mounted.resolve} />,
    );
    const client = await mounted.promise;
    client.setQueryData(reportListQuery.queryKey, []);

    await deleteReplicaDb(householdId);

    expect(client.getQueryCache().getAll()).toEqual([]);
    runtime.close();
  });

  it("deletes the IndexedDB database where an earlier version kept the Reports", async () => {
    const legacy = indexedDB.open("finance-reports");
    await new Promise((resolve) => {
      legacy.onsuccess = resolve;
    });
    legacy.result.close();
    expect(await databaseNames()).toContain("finance-reports");

    const runtime = await renderProvider(randomUUID(), null);

    await waitFor(async () => {
      expect(await databaseNames()).not.toContain("finance-reports");
    });
    runtime.close();
  });
});
