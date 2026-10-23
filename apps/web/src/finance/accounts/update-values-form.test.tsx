import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, userEvent } from "#src/testing/test-utils.tsx";
import {
  createTestReplica,
  TEST_IDS,
  testReplicaRows,
} from "../transactions/testing/create-test-replica.ts";
import { renderWithReplica } from "../transactions/testing/render-with-replica.tsx";
import { UpdateValuesForm } from "./update-values-form.tsx";

const ids = TEST_IDS;
const STAMP = "2026-01-01T09:00:00.000Z";

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

/** The test Household with a Stocks ISA worth £10,000 since 1 January. */
function rowsWithIsaValue() {
  const rows = testReplicaRows();
  return {
    ...rows,
    valuations: [
      {
        id: "00000000-0000-4000-8000-000000000301",
        householdId: ids.household,
        accountId: ids.isa,
        on: "2026-01-01",
        amountMinor: 1_000_000,
        source: "manual" as const,
        note: "",
        version: 1,
        createdAt: STAMP,
        updatedAt: STAMP,
        deletedAt: null,
      },
    ],
    accountBalanceDays: [
      {
        householdId: ids.household,
        accountId: ids.isa,
        day: "2026-01-01",
        balanceMinor: 1_000_000,
        version: 1,
        deletedAt: null,
      },
    ],
  };
}

describe("UpdateValuesForm", () => {
  it("shows the change and its share next to a new balance", async () => {
    const runtime = await createTestReplica(rowsWithIsaValue());
    renderWithReplica(runtime, <UpdateValuesForm />, { pathname: "/finance" });
    const user = userEvent.setup();

    const field = screen.getByRole("textbox", { name: "Stocks ISA" });
    expect(field).toHaveValue("10,000.00");
    await user.clear(field);
    await user.type(field, "100000");
    expect(screen.getByText(/\+£90,000\.00 · \+900%/)).toBeVisible();
  });

  it("asks for no exchange rate when a foreign account joins the list", async () => {
    const runtime = await createTestReplica(rowsWithIsaValue());
    renderWithReplica(runtime, <UpdateValuesForm />, { pathname: "/finance" });
    const user = userEvent.setup();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Add an account to this list" }),
      ids.dollars,
    );
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.queryByText("Exchange rates")).toBeNull();
  });
});
