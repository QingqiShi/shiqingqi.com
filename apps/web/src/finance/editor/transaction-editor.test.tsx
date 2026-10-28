import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, userEvent } from "#src/testing/test-utils.tsx";
import {
  createTestReplica,
  TEST_IDS,
} from "../transactions/testing/create-test-replica.ts";
import { renderWithReplica } from "../transactions/testing/render-with-replica.tsx";
import { TransactionEditor } from "./transaction-editor.tsx";

const ids = TEST_IDS;

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
});
