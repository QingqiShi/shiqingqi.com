import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, userEvent, waitFor } from "#src/testing/test-utils.tsx";
import {
  createTestReplica,
  TEST_IDS,
  testReplicaRows,
} from "../transactions/testing/create-test-replica.ts";
import { renderWithAccountsReplica } from "./testing/render-with-accounts-replica.tsx";
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
  it("shows each change, asks again about a large one, and saves with Undo", async () => {
    const runtime = await createTestReplica(rowsWithIsaValue());
    const { pushed } = renderWithAccountsReplica(runtime, <UpdateValuesForm />);
    const user = userEvent.setup();

    const field = screen.getByRole("textbox", { name: "Stocks ISA" });
    expect(field).toHaveValue("10,000.00");
    await user.clear(field);
    await user.type(field, "100000");
    expect(
      screen.getByText(/\+£90,000\.00 · \+900%.*check this/),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Save all/ }));
    expect(screen.getByText("Some balances changed a lot")).toBeVisible();
    expect(runtime.store.takeOutbox()).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Save anyway" }));
    const [saved] = runtime.store.takeOutbox();
    expect(saved).toMatchObject({
      name: "putValuation",
      args: { accountId: ids.isa, amountMinor: 10_000_000 },
    });
    expect(pushed).toEqual(["/finance"]);

    await user.click(await screen.findByRole("button", { name: "Undo" }));
    await waitFor(() => {
      expect(runtime.store.takeOutbox()).toMatchObject([
        { name: "deleteValuation" },
      ]);
    });
  });

  it("writes the exchange rate of a foreign account's currency", async () => {
    const runtime = await createTestReplica(rowsWithIsaValue());
    renderWithAccountsReplica(runtime, <UpdateValuesForm />);
    const user = userEvent.setup();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Add an account to this list" }),
      ids.dollars,
    );
    const rate = screen.getByRole("textbox", { name: "1 USD in GBP" });
    expect(rate).toHaveValue("0.8");
    await user.clear(rate);
    await user.type(rate, "0.79");
    await user.click(screen.getByRole("button", { name: /Save all/ }));

    expect(runtime.store.takeOutbox()).toMatchObject([
      {
        name: "setFxRate",
        args: { base: "USD", quote: "GBP", rate: 0.79 },
      },
    ]);
  });
});
