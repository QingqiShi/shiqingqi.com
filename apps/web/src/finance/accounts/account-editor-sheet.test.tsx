import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, userEvent } from "#src/testing/test-utils.tsx";
import {
  createTestReplica,
  TEST_IDS,
} from "../transactions/testing/create-test-replica.ts";
import { AccountEditorSheet } from "./account-editor-sheet.tsx";
import { renderWithAccountsReplica } from "./testing/render-with-accounts-replica.tsx";

const ids = TEST_IDS;

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

async function openEditor(accountId: string | null) {
  const runtime = await createTestReplica();
  const account =
    accountId === null
      ? null
      : (runtime.store.getSnapshot().tables.accounts.get(accountId) ?? null);
  const onClose = vi.fn();
  const onDeleted = vi.fn();
  renderWithAccountsReplica(
    runtime,
    <AccountEditorSheet
      account={account}
      isOpen
      onClose={onClose}
      onDeleted={onDeleted}
    />,
  );
  return { runtime, onClose, onDeleted, user: userEvent.setup() };
}

describe("AccountEditorSheet", () => {
  it("offers Close, not Delete, for an account with history", async () => {
    await openEditor(ids.card);
    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeDisabled();
    expect(screen.getByText(/Close it instead/)).toBeVisible();
  });

  it("deletes an account with no history, with Undo", async () => {
    const { runtime, onDeleted, user } = await openEditor(ids.isa);
    await user.click(screen.getByRole("button", { name: "Delete account" }));
    expect(runtime.store.takeOutbox()).toMatchObject([
      { name: "upsertAccount", args: { id: ids.isa, deleted: true } },
    ]);
    expect(onDeleted).toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    expect(runtime.store.takeOutbox()).toMatchObject([
      { name: "upsertAccount", args: { id: ids.isa, deleted: false } },
    ]);
  });

  it("picks the currency from a list and leaves Closed out of a new account", async () => {
    await openEditor(null);
    const currency = screen.getByRole("combobox", { name: "Currency" });
    expect(currency).toHaveValue("GBP");
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(expect.arrayContaining(["GBP", "USD", "EUR"]));
    expect(screen.queryByRole("checkbox", { name: /Closed/ })).toBeNull();
  });

  it("saves the account a credit card is paid from", async () => {
    const { runtime, user } = await openEditor(ids.card);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Paid from" }),
      ids.current,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(runtime.store.takeOutbox()).toMatchObject([
      {
        name: "upsertAccount",
        args: { id: ids.card, defaultPaymentAccountId: ids.current },
      },
    ]);
  });
});
