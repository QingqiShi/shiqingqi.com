import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { screen, userEvent, within } from "#src/testing/test-utils.tsx";
import { TransactionEditor } from "../editor/transaction-editor.tsx";
import { stubFinanceApi } from "../testing/stub-finance-api.ts";
import {
  createTestReplica,
  TEST_IDS,
  testExpense,
  testReplicaRows,
} from "./testing/create-test-replica.ts";
import { renderWithReplica } from "./testing/render-with-replica.tsx";
import { useTeachAi } from "./use-teach-ai.tsx";

const ids = TEST_IDS;
const TFL = "00000000-0000-4000-8000-000000000301";
const TFL_ENTRY = "00000000-0000-4000-8000-000000000302";

function Screen({ transactionId }: { transactionId: string }) {
  const teach = useTeachAi();
  return (
    <>
      <TransactionEditor
        transactionId={transactionId}
        onClose={() => undefined}
        onOpenTransaction={() => undefined}
        watchCorrection={teach.watch}
      />
      {teach.sheet}
    </>
  );
}

async function openTfl(labelledBy: "ai" | "member") {
  const rows = testReplicaRows();
  const { transaction, entry } = testExpense(TFL, TFL_ENTRY, {
    date: "2026-10-09",
    amountMinor: -280,
    accountId: ids.current,
    payeeId: ids.tesco,
    categoryId: ids.groceries,
    labelledBy,
    aiReason: labelledBy === "ai" ? "Tesco is groceries" : null,
  });
  const runtime = await createTestReplica({
    ...rows,
    transactions: [...(rows.transactions ?? []), transaction],
    entries: [...(rows.entries ?? []), entry],
  });
  renderWithReplica(runtime, <Screen transactionId={TFL} />);
}

async function recategoriseAsTransport() {
  await userEvent.click(screen.getByRole("button", { name: /Transport/ }));
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
}

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTeachAi", () => {
  it("offers Teach the AI after a correction, shows the draft, and saves the Member's edit of it", async () => {
    const calls = stubFinanceApi({
      "POST /api/finance/ai/teach": () => ({
        json: { replaces: null, line: "TFL TRAVEL is Transport." },
      }),
      "PATCH /api/finance/household/ai-instructions": () => ({
        json: { clock: 11 },
      }),
    });
    await openTfl("ai");
    await recategoriseAsTransport();

    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Saved");
    expect(
      within(toast).getByRole("button", { name: "Undo" }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(toast).getByRole("button", { name: "Teach the AI" }),
    );

    expect(calls[0]).toEqual({
      route: "POST /api/finance/ai/teach",
      body: {
        transactionId: TFL,
        ai: {
          kind: "expense",
          category: "Groceries",
          payee: "Tesco",
          tags: [],
          member: null,
          accounts: ["Current account"],
        },
        member: {
          kind: "expense",
          category: "Transport",
          payee: "Tesco",
          tags: [],
          member: null,
          accounts: ["Current account"],
        },
      },
    });
    const sheet = await screen.findByRole("dialog", { name: "Teach the AI" });
    const line = await within(sheet).findByRole("textbox", {
      name: "New line",
    });
    expect(line).toHaveValue("TFL TRAVEL is Transport.");
    await userEvent.type(line, " Tag it Tube.");
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Save to instructions" }),
    );

    expect(calls.at(-1)).toEqual({
      route: "PATCH /api/finance/household/ai-instructions",
      body: {
        change: {
          replaces: null,
          line: "TFL TRAVEL is Transport. Tag it Tube.",
        },
      },
    });
    expect(await screen.findByText("AI instructions saved")).toBeVisible();
  });

  it("shows the line a draft replaces, and saves nothing on Dismiss", async () => {
    const calls = stubFinanceApi({
      "POST /api/finance/ai/teach": () => ({
        json: {
          replaces: "Tesco is groceries.",
          line: "Tesco is groceries, but TFL TRAVEL is Transport.",
        },
      }),
    });
    await openTfl("ai");
    await recategoriseAsTransport();
    await userEvent.click(screen.getByRole("button", { name: "Teach the AI" }));

    const sheet = await screen.findByRole("dialog", { name: "Teach the AI" });
    expect(
      await within(sheet).findByText("Tesco is groceries."),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByRole("textbox", { name: "Changed line" }),
    ).toHaveValue("Tesco is groceries, but TFL TRAVEL is Transport.");
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Dismiss" }),
    );

    expect(calls.map((call) => call.route)).toEqual([
      "POST /api/finance/ai/teach",
    ]);
  });

  it("offers nothing when a Member's own labels change", async () => {
    stubFinanceApi({});
    await openTfl("member");
    await recategoriseAsTransport();

    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Saved");
    expect(
      within(toast).queryByRole("button", { name: "Teach the AI" }),
    ).toBeNull();
  });
});
