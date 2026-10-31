import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createTestReplica,
  createUnloadedTestRuntime,
} from "../transactions/testing/create-test-replica.ts";
import { FinanceRuntimeTestProvider } from "../transactions/testing/finance-runtime-test-provider.tsx";
import type { FinanceRuntime } from "./create-finance-runtime.ts";
import { useReplica } from "./use-replica.ts";

function HouseholdName() {
  const household = useReplica((snapshot) => snapshot.household);
  return <p>{household?.name ?? "Skeleton"}</p>;
}

function screenOf(runtime: FinanceRuntime) {
  return (
    <FinanceRuntimeTestProvider runtime={runtime}>
      <HouseholdName />
    </FinanceRuntimeTestProvider>
  );
}

describe("useReplica", () => {
  // A boundary that hydrates late reads the Replica after the load. It must
  // still read what the server read.
  it("hydrates as the server rendered it, then shows the loaded Replica", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(screenOf(createUnloadedTestRuntime()));
    document.body.appendChild(container);
    const recoverableErrors: unknown[] = [];

    render(screenOf(await createTestReplica()), {
      container,
      hydrate: true,
      onRecoverableError: (error) => recoverableErrors.push(error),
    });

    expect(recoverableErrors).toStrictEqual([]);
    expect(screen.getByText("Home")).toBeInTheDocument();
  });
});
