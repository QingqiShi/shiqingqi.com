import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, userEvent } from "#src/testing/test-utils.tsx";
import type {
  QuickAddInterpretation,
  QuickAddReading,
} from "../transactions/interpret-quick-add.ts";
import {
  createTestReplica,
  TEST_IDS,
} from "../transactions/testing/create-test-replica.ts";
import { renderWithReplica } from "../transactions/testing/render-with-replica.tsx";
import { editorDraft, type EditorDraft } from "./editor-draft.ts";
import { TransactionEditor, type EditorHost } from "./transaction-editor.tsx";

const ids = TEST_IDS;

const host: EditorHost = {
  close: () => undefined,
  afterSave: () => undefined,
  openTransaction: () => undefined,
  refund: () => undefined,
  watchCorrection: () => () => undefined,
};

/** An AI reading of an expense of 12.50 with `fields`. */
function expenseReading(
  id: number,
  fields: Partial<EditorDraft>,
): QuickAddInterpretation {
  const reading = (kind: EditorDraft["kind"]): QuickAddReading => ({
    draft: editorDraft(kind, "2026-10-01", { amountText: "12.50", ...fields }),
    amountMinor: 1_250,
    marks: { category: { source: "ai", unsure: false } },
  });
  return {
    id,
    text: `line ${String(id)}`,
    via: "ai",
    isFallback: false,
    kind: "expense",
    readings: {
      expense: reading("expense"),
      income: reading("income"),
      transfer: reading("transfer"),
    },
  };
}

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe("TransactionEditor", () => {
  it("saves a transfer, with the second amount at the latest rate", async () => {
    const runtime = await createTestReplica();
    renderWithReplica(
      runtime,
      <TransactionEditor
        transactionId={null}
        initialKind="transfer"
        host={{
          close: () => undefined,
          afterSave: () => undefined,
          openTransaction: () => undefined,
          refund: () => undefined,
          watchCorrection: () => () => undefined,
        }}
      />,
    );
    await userEvent.keyboard("500");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "From" }),
      ids.current,
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "To" }),
      ids.dollars,
    );
    expect(
      screen.getByRole("textbox", { name: /Amount received/ }),
    ).toHaveValue("625.00");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(runtime.store.takeOutbox().at(-1)).toMatchObject({
      name: "createTransaction",
      args: {
        kind: "transfer",
        entries: [
          { accountId: ids.current, amountMinor: -50_000 },
          { accountId: ids.dollars, amountMinor: 62_500 },
        ],
      },
    });
  });

  it("fills each new reading of quick add into the fields the Member has not touched", async () => {
    const runtime = await createTestReplica();
    const first = expenseReading(1, {
      categoryId: ids.groceries,
      accountId: ids.card,
    });
    const second = expenseReading(2, {
      categoryId: ids.transport,
      accountId: ids.card,
    });
    function Harness() {
      const [reading, setReading] = useState(first);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setReading(second);
            }}
          >
            Next reading
          </button>
          <TransactionEditor
            transactionId={null}
            interpretation={reading}
            host={host}
          />
        </>
      );
    }
    renderWithReplica(runtime, <Harness />);
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Account" }),
      ids.current,
    );
    await userEvent.click(screen.getByRole("button", { name: "Next reading" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(runtime.store.takeOutbox().at(-1)).toMatchObject({
      name: "createTransaction",
      args: {
        categoryId: ids.transport,
        entries: [{ accountId: ids.current, amountMinor: -1_250 }],
      },
    });
  });
});
