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
    await userEvent.keyboard("{Enter}");

    const [created] = runtime.store.takeOutbox();
    if (created.name !== "createTransaction") throw new Error("Not created");
    expect(created.args).toMatchObject({
      kind: "expense",
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
});
