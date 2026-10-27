import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { nextPopState } from "#src/testing/next-pop-state.ts";
import { renderHook } from "#src/testing/test-utils.tsx";
import { EMPTY_TRANSACTION_FILTERS } from "./transaction-filters.ts";
import { useTransactionsUrl } from "./use-transactions-url.ts";

const router: AppRouterInstance = {
  back: () => undefined,
  forward: () => undefined,
  refresh: () => undefined,
  push: () => undefined,
  replace: () => undefined,
  prefetch: () => undefined,
  bfcacheId: "test",
};

function renderUrl() {
  const search = new URLSearchParams(window.location.search);
  return renderHook(() => useTransactionsUrl(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppRouterContext value={router}>
        <SearchParamsContext value={search}>{children}</SearchParamsContext>
      </AppRouterContext>
    ),
  }).result.current;
}

beforeEach(() => {
  window.history.replaceState(null, "", "/finance/transactions?q=tesco");
});

describe("useTransactionsUrl", () => {
  it("keeps the open Transaction when the filters change, and its close still goes back", async () => {
    renderUrl().open("t1");
    renderUrl().setFilters({ ...EMPTY_TRANSACTION_FILTERS, query: "aldi" });
    expect(window.location.search).toBe("?q=aldi&id=t1");

    const popped = nextPopState();
    renderUrl().close();
    await popped;
    expect(window.location.search).toBe("?q=tesco");
  });

  it("changes an open pane in place, so one close leaves it", async () => {
    renderUrl().open("t1");
    renderUrl().openNew("expense", "t1");
    expect(window.location.search).toBe("?q=tesco&new=expense&refund=t1");

    const popped = nextPopState();
    renderUrl().close();
    await popped;
    expect(window.location.search).toBe("?q=tesco");
  });
});
