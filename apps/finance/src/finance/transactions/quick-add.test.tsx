import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  screen,
  userEvent,
  waitFor,
  within,
} from "#src/testing/test-utils.tsx";
import type { QuickAddResponse } from "../ai/types.ts";
import type { EditorSeed } from "../editor/transaction-editor.tsx";
import { QuickAdd } from "./quick-add.tsx";
import { createTestReplica, TEST_IDS } from "./testing/create-test-replica.ts";
import { renderWithReplica } from "./testing/render-with-replica.tsx";

const ids = TEST_IDS;

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The quick-add endpoint answers every request with `body` and `status`. */
function stubQuickAdd(status: number, body: (text: string) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn((_path: string, init: RequestInit) => {
      const sent = typeof init.body === "string" ? init.body : "{}";
      const { text } = JSON.parse(sent) as { text: string };
      return Promise.resolve(Response.json(body(text), { status }));
    }),
  );
}

function aiReply(
  text: string,
  fields: Partial<QuickAddResponse> = {},
): QuickAddResponse {
  return {
    text,
    kind: { value: "expense", probability: 0.95 },
    amountMinor: { value: 1_250, probability: 1 },
    date: { value: "2026-10-01", probability: 1 },
    accountId: { value: ids.current, probability: 0.8 },
    expenseCategoryId: {
      value: ids.dining,
      probability: 0.4,
      runnerUp: ids.groceries,
    },
    incomeCategoryId: { value: ids.salary, probability: 0.9 },
    payee: { value: { name: "Pizza Place" }, probability: 0.9 },
    paysDownAccountId: null,
    fromAccountId: null,
    toAccountId: null,
    memberId: null,
    tagIds: [],
    ...fields,
  };
}

async function setup() {
  const runtime = await createTestReplica();
  const onNeedsEditor = vi.fn<(seed: EditorSeed) => void>();
  renderWithReplica(runtime, <QuickAdd onNeedsEditor={onNeedsEditor} />);
  const field = screen.getByRole("textbox", { name: "Quick add" });
  const settled = () =>
    waitFor(() => {
      expect(field).toHaveAttribute("aria-busy", "false");
    });
  return { runtime, onNeedsEditor, field, settled };
}

describe("QuickAdd", () => {
  it("reads by rules when the AI has no model, saves nothing on an Enter before that reading, and Undo deletes the save", async () => {
    stubQuickAdd(503, () => ({ error: "model-unavailable" }));
    const { runtime, field, settled } = await setup();
    await userEvent.type(field, "12.5 tes");
    await userEvent.keyboard("{Enter}");
    await settled();
    expect(runtime.store.takeOutbox()).toEqual([]);

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

  it("saves what the AI read, with a field it is not sure of", async () => {
    stubQuickAdd(200, (text) => aiReply(text));
    const { runtime, field, settled } = await setup();
    await userEvent.type(field, "pizza 12.5");
    await settled();
    await userEvent.keyboard("{Enter}");

    const created = runtime.store
      .takeOutbox()
      .find((mutation) => mutation.name === "createTransaction");
    expect(created?.args).toMatchObject({
      kind: "expense",
      categoryId: ids.dining,
      entries: [{ accountId: ids.current, amountMinor: -1_250 }],
    });
  });

  it("opens the editor at the first field a save needs", async () => {
    stubQuickAdd(200, (text) => aiReply(text, { expenseCategoryId: null }));
    const { runtime, onNeedsEditor, field, settled } = await setup();
    await userEvent.type(field, "pizza 12.5");
    await settled();
    await userEvent.keyboard("{Enter}");

    expect(runtime.store.takeOutbox()).toEqual([]);
    expect(onNeedsEditor.mock.calls.at(0)?.at(0)).toMatchObject({
      focus: "category",
      draft: { payeeName: "Pizza Place", accountId: ids.current },
    });
  });

  it("keeps a field changed with its chip when a later reading arrives", async () => {
    stubQuickAdd(200, (text) => aiReply(text));
    const { runtime, field, settled } = await setup();
    await userEvent.type(field, "pizza 12.5");
    await settled();
    await userEvent.click(
      screen.getByRole("button", { name: "Category: Dining, not sure" }),
    );
    const picker = screen.getByRole("dialog", { name: "Category" });
    const [runnerUp] = within(picker).getAllByRole("button", {
      name: "Groceries",
    });
    await userEvent.click(runnerUp);

    await userEvent.type(field, " tonight");
    await settled();
    await userEvent.keyboard("{Enter}");
    const created = runtime.store
      .takeOutbox()
      .find((mutation) => mutation.name === "createTransaction");
    expect(created?.args).toMatchObject({ categoryId: ids.groceries });
  });
});
