import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, userEvent } from "#src/testing/test-utils.tsx";
import { QuickAdd } from "./quick-add.tsx";
import { createTestReplica, TEST_IDS } from "./testing/create-test-replica.ts";
import { renderWithReplica } from "./testing/render-with-replica.tsx";

const ids = TEST_IDS;

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

async function setup() {
  const runtime = await createTestReplica();
  const onNeedsEditor = vi.fn();
  renderWithReplica(runtime, <QuickAdd onNeedsEditor={onNeedsEditor} />);
  return {
    runtime,
    onNeedsEditor,
    field: screen.getByRole("textbox", { name: "Quick add" }),
  };
}

describe("QuickAdd", () => {
  it("saves a known Payee at once with the rest from its last time, and Undo deletes it", async () => {
    const { runtime, field } = await setup();
    await userEvent.type(field, "12.5 tes");
    expect(
      screen.getByText(/Tesco · Groceries · Credit card/),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");

    const [created] = runtime.store.takeOutbox();
    if (created.name !== "createTransaction") throw new Error("Not created");
    expect(created.args).toMatchObject({
      kind: "expense",
      amountMinor: -1_250,
      payeeId: ids.tesco,
      categoryId: ids.groceries,
      memberId: ids.sam,
      tagIds: [ids.weeklyShop],
      entries: [{ accountId: ids.card, amountMinor: -1_250 }],
    });
    expect(field).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(runtime.store.takeOutbox()).toEqual([
      expect.objectContaining({
        name: "deleteTransaction",
        args: { id: created.args.id },
      }),
    ]);
  });

  it("saves a Category name as the Category, with no Payee", async () => {
    const { runtime, field } = await setup();
    await userEvent.type(field, "12.50 groceries");
    expect(
      screen.getByText(/^Expense · £12\.50 · Groceries · /),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    const [created] = runtime.store.takeOutbox();
    if (created.name !== "createTransaction") throw new Error("Not created");
    expect(created.args).toMatchObject({
      kind: "expense",
      amountMinor: -1_250,
      payeeId: null,
      categoryId: ids.groceries,
      entries: [{ accountId: ids.card }],
    });
  });

  it("makes an income of an income Category without a sign", async () => {
    const { runtime, field } = await setup();
    await userEvent.type(field, "2000 💼{Enter}");
    const [created] = runtime.store.takeOutbox();
    if (created.name !== "createTransaction") throw new Error("Not created");
    expect(created.args).toMatchObject({
      kind: "income",
      amountMinor: 200_000,
      categoryId: ids.salary,
    });
  });

  it("takes the account named after an amount in the middle", async () => {
    const { runtime, field } = await setup();
    await userEvent.type(field, "tesco 8 current{Enter}");
    const [created] = runtime.store.takeOutbox();
    if (created.name !== "createTransaction") throw new Error("Not created");
    expect(created.args).toMatchObject({
      payeeId: ids.tesco,
      entries: [{ accountId: ids.current, amountMinor: -800 }],
    });
  });

  it("shows examples from the Household's own data", async () => {
    const { field } = await setup();
    expect(field).toHaveAttribute(
      "placeholder",
      expect.stringMatching(/^12\.50 Tesco · \+2000 /),
    );
  });

  it("saves a transfer between named accounts", async () => {
    const { runtime, field } = await setup();
    await userEvent.type(field, "500 current > isa{Enter}");
    const [created] = runtime.store.takeOutbox();
    if (created.name !== "createTransaction") throw new Error("Not created");
    expect(created.args).toMatchObject({
      kind: "transfer",
      entries: [
        { accountId: ids.current, amountMinor: -50_000 },
        { accountId: ids.isa, amountMinor: 50_000 },
      ],
    });
  });

  it("opens the editor when the line names a new Payee", async () => {
    const { runtime, onNeedsEditor, field } = await setup();
    await userEvent.type(field, "+2000 Acme Ltd{Enter}");
    expect(runtime.store.takeOutbox()).toEqual([]);
    expect(onNeedsEditor).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "income", amountText: "2000.00" }),
    );
  });

  it("asks for an amount", async () => {
    const { runtime, field } = await setup();
    await userEvent.type(field, "tesco{Enter}");
    expect(
      screen.getByText("Start or end with an amount, such as 12.50 Tesco."),
    ).toBeInTheDocument();
    expect(runtime.store.takeOutbox()).toEqual([]);
  });
});
