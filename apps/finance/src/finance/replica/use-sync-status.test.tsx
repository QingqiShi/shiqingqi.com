import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createTestReplica } from "../transactions/testing/create-test-replica.ts";
import { FinanceRuntimeTestProvider } from "../transactions/testing/finance-runtime-test-provider.tsx";
import type { FinanceRuntime } from "./create-finance-runtime.ts";
import { useSyncStatus } from "./use-sync-status.ts";

function LastSynced() {
  const { lastSyncedAt } = useSyncStatus();
  return <p>{lastSyncedAt === null ? "Never synced" : "Synced"}</p>;
}

function screenOf(runtime: FinanceRuntime) {
  return (
    <FinanceRuntimeTestProvider runtime={runtime}>
      <LastSynced />
    </FinanceRuntimeTestProvider>
  );
}

describe("useSyncStatus", () => {
  // A boundary that hydrates late reads the status after a sync. It must
  // still read what the server read.
  it("hydrates as the server rendered it, then shows the live status", async () => {
    const runtime = await createTestReplica();
    const container = document.createElement("div");
    container.innerHTML = renderToString(screenOf(runtime));
    document.body.appendChild(container);
    runtime.loop.followStatus({
      ...runtime.loop.getStatus(),
      lastSyncedAt: "2026-10-01T09:00:00.000Z",
    });
    const recoverableErrors: unknown[] = [];

    render(screenOf(runtime), {
      container,
      hydrate: true,
      onRecoverableError: (error) => recoverableErrors.push(error),
    });

    expect(recoverableErrors).toStrictEqual([]);
    expect(screen.getByText("Synced")).toBeInTheDocument();
  });
});
