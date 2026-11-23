import { and, eq, inArray, max } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import type { PmAction } from "../contracts/pm-decision-schema.ts";
import { closeOrphanThesis } from "../desk/close-orphan-thesis.ts";
import {
  cashEntries,
  journalEntries,
  orders,
  riskPolicyVersions,
  theses,
  thesisVersions,
} from "../fund-schema.ts";
import { GUARDRAILS } from "../guardrails.ts";
import type { JournalEntry } from "../types.ts";
import { journalText } from "./journal-text.ts";
import { activeFundThesisId, loadFundState } from "./load-fund-state.ts";
import { sayIn } from "./memos.ts";
import { stepOutputs } from "./step-outputs.ts";
import type { StepContext, StepOutcome } from "./types.ts";

type NewJournalEntry = Omit<JournalEntry, "id" | "createdAt">;

const STARTING_DEPOSIT_KEY = "deposit:start";

function withReason(
  rationale: string,
  label: string,
  reasons: readonly string[],
): string {
  const body = rationale.trim();
  const why = reasons.map((r) => `- ${r}`).join("\n");
  return body === ""
    ? `**${label}**\n\n${why}`
    : `${body}\n\n**${label}**\n\n${why}`;
}

/**
 * Writes the decisions of a daily meeting: the orders, the cancels, the
 * position theses and one journal entry for each decision. The caller runs
 * it inside the transaction that also marks the run completed.
 */
async function daily(ctx: StepContext, tx: FundDb): Promise<StepOutcome> {
  const { asOf } = ctx.run;
  const runId = ctx.run.id;
  const language = ctx.deps.language;
  const say = sayIn(language);
  const text = journalText(language);
  const final = ctx.output("pm_final", stepOutputs.pm);
  const checks = ctx.output("checks_final", stepOutputs.finalChecks);
  if (!final || !checks)
    throw new Error("The final decision or its checks are missing.");
  const signoff = ctx.output("risk_signoff", stepOutputs.signoff);
  const state = await loadFundState(tx, asOf);
  const instrumentOf = (symbol: string) =>
    state.instruments.find((i) => i.symbol === symbol && i.kind === "stock");

  const vetoes = new Map(
    (signoff?.verdicts ?? [])
      .filter((v) => v.verdict === "vetoed")
      .map((v) => [v.symbol, v.reason]),
  );
  const breaches = new Map<string, string[]>();
  for (const v of checks.plan.violations) {
    breaches.set(v.symbol, [...(breaches.get(v.symbol) ?? []), v.message]);
  }
  const placed = checks.plan.planned.filter((o) => !vetoes.has(o.symbol));
  const placedSymbols = new Set(placed.map((o) => o.symbol));
  const journal: NewJournalEntry[] = [];
  const entry = (
    e: Omit<NewJournalEntry, "runId" | "date" | "orderId"> & {
      orderId?: string | null;
    },
  ) => {
    journal.push({ runId, date: asOf, orderId: null, ...e });
  };

  const isTrade = (a: PmAction) => a.action === "buy" || a.action === "sell";
  const thesisIds = new Map(
    [...state.positionTheses].map(([symbol, t]) => [symbol, t.thesisId]),
  );
  let thesesWritten = 0;
  for (const action of checks.actions) {
    if (action.thesis === null || action.action === "cancel_order") continue;
    if (!instrumentOf(action.symbol)) continue;
    if (isTrade(action) && !placedSymbols.has(action.symbol)) continue;
    const existing = state.positionTheses.get(action.symbol);
    if (existing) {
      await tx.insert(thesisVersions).values({
        thesisId: existing.thesisId,
        version: existing.version + 1,
        runId,
        body: action.thesis,
        changeNote: action.thesisChangeNote,
      });
      thesesWritten += 1;
    } else if (action.action === "buy") {
      const [thesis] = await tx
        .insert(theses)
        .values({ scope: "position", symbol: action.symbol, status: "active" })
        .returning({ id: theses.id });
      await tx.insert(thesisVersions).values({
        thesisId: thesis.id,
        version: 1,
        runId,
        body: action.thesis,
        changeNote: action.thesisChangeNote,
      });
      thesisIds.set(action.symbol, thesis.id);
      thesesWritten += 1;
    }
  }

  const cancelled =
    checks.plan.cancelOrderIds.length === 0
      ? []
      : await tx
          .update(orders)
          .set({
            status: "cancelled",
            statusNote: say(
              `Cancelled by the PM at the meeting of ${asOf}.`,
              `PM 在 ${asOf} 的会议上撤销。`,
            ),
            resolvedAt: ctx.deps.now(),
          })
          .where(
            and(
              inArray(orders.id, checks.plan.cancelOrderIds),
              eq(orders.status, "open"),
            ),
          )
          .returning();
  for (const order of cancelled) {
    const action = checks.actions.find(
      (a) => a.symbol === order.symbol && a.action === "cancel_order",
    );
    entry({
      symbol: order.symbol,
      kind: "cancel_order",
      summary: text.cancel(order, state.instrumentFor(order.symbol)),
      rationale: action?.rationale ?? "",
      orderId: order.id,
    });
  }

  for (const planned of placed) {
    const action = checks.actions.find(
      (a) => a.symbol === planned.symbol && a.action === planned.side,
    );
    const [order] = await tx
      .insert(orders)
      .values({
        runId,
        symbol: planned.symbol,
        side: planned.side,
        quantity: planned.quantity,
        limitPrice: planned.limitPrice,
        placedFor: asOf,
        validUntil: planned.validUntil,
        onExpiry: planned.onExpiry,
        repriceLimit: planned.repriceLimit,
        unfilledPlan: planned.unfilledPlan,
        rationale: planned.rationale,
        thesisId: thesisIds.get(planned.symbol) ?? null,
        status: "open",
      })
      .returning();
    entry({
      symbol: order.symbol,
      kind: order.side,
      summary: text.order(
        order,
        state.instrumentFor(order.symbol),
        planned.weightAfterPct,
      ),
      rationale: action?.rationale ?? planned.rationale,
      orderId: order.id,
    });
  }
  for (const order of cancelled) {
    if (order.side === "buy" && order.thesisId !== null) {
      await closeOrphanThesis(tx, {
        thesisId: order.thesisId,
        symbol: order.symbol,
      });
    }
  }

  for (const action of checks.actions) {
    const instrument = instrumentOf(action.symbol);
    const reasons = breaches.get(action.symbol);
    const rejectedEntry = (why: string, list: readonly string[]) => {
      entry({
        symbol: instrument ? action.symbol : null,
        kind: "rejected",
        summary: text.rejected(action.action, action.symbol, why),
        rationale: withReason(action.rationale, why, list),
      });
    };
    if (isTrade(action)) {
      if (placedSymbols.has(action.symbol)) continue;
      const veto = vetoes.get(action.symbol);
      if (veto !== undefined && !reasons) rejectedEntry(text.veto, [veto]);
      else
        rejectedEntry(
          text.breach,
          reasons ?? [say("No order was derived.", "没有生成委托。")],
        );
    } else if (action.action === "hold") {
      if (!instrument) {
        rejectedEntry(text.breach, reasons ?? []);
      } else if (checks.addedHolds.includes(action.symbol)) {
        entry({
          symbol: action.symbol,
          kind: "hold",
          summary: text.holdUnrecorded(action.symbol),
          rationale: text.unrecordedRationale,
        });
      } else {
        entry({
          symbol: action.symbol,
          kind: "hold",
          summary: text.hold(action.symbol),
          rationale: action.rationale,
        });
      }
    } else if (!cancelled.some((o) => o.symbol === action.symbol)) {
      rejectedEntry(text.breach, reasons ?? []);
    }
  }

  if (placed.length === 0) {
    entry({
      symbol: null,
      kind: "no_action",
      summary: text.noAction,
      rationale:
        final.noActionReason?.trim() ||
        `${final.marketView}\n\n${final.planCheck}`,
    });
  }
  if (journal.length > 0) await tx.insert(journalEntries).values(journal);

  const memo = [
    say(
      `Placed ${String(placed.length)} order(s), cancelled ${String(cancelled.length)}, wrote ${String(thesesWritten)} position thesis version(s) and ${String(journal.length)} journal entries.`,
      `下达 ${String(placed.length)} 笔委托，撤销 ${String(cancelled.length)} 笔，写入 ${String(thesesWritten)} 个持仓逻辑版本和 ${String(journal.length)} 条日志。`,
    ),
    ...journal.map((j) => `- ${j.summary}`),
    final.requestStrategyReview
      ? say(
          `The PM asks for a strategy review: ${final.strategyReviewReason ?? ""}`,
          `PM 请求召开策略会议：${final.strategyReviewReason ?? ""}`,
        )
      : "",
  ].filter(Boolean);
  return {
    status: "done",
    output: {
      orders: placed.length,
      cancelled: cancelled.map((o) => o.id),
      journal: journal.length,
      theses: thesesWritten,
    },
    memo: memo.join("\n"),
  };
}

/**
 * Writes a strategy session: a new fund thesis version, a new risk policy
 * version and a journal entry; on the first session, the starting deposit.
 */
async function strategy(ctx: StepContext, tx: FundDb): Promise<StepOutcome> {
  const { asOf } = ctx.run;
  const runId = ctx.run.id;
  const say = sayIn(ctx.deps.language);
  const thesis = ctx.output("pm_strategy", stepOutputs.thesis);
  const policy = ctx.output("risk_strategy", stepOutputs.policy);
  if (!thesis || !policy)
    throw new Error("The thesis or the policy is missing.");
  const { changeNote: thesisNote, ...thesisBody } = thesis;
  const { changeNote: policyNote, ...policyBody } = policy;

  const fundThesisId =
    (await activeFundThesisId(tx)) ??
    (
      await tx
        .insert(theses)
        .values({ scope: "fund", status: "active" })
        .returning({ id: theses.id })
    )[0].id;
  const [{ latest }] = await tx
    .select({ latest: max(thesisVersions.version) })
    .from(thesisVersions)
    .where(eq(thesisVersions.thesisId, fundThesisId));
  const thesisVersion = (latest ?? 0) + 1;
  await tx.insert(thesisVersions).values({
    thesisId: fundThesisId,
    version: thesisVersion,
    runId,
    body: thesisBody,
    changeNote: thesisNote,
  });
  const [{ latestPolicy }] = await tx
    .select({ latestPolicy: max(riskPolicyVersions.version) })
    .from(riskPolicyVersions);
  const policyVersion = (latestPolicy ?? 0) + 1;
  await tx.insert(riskPolicyVersions).values({
    version: policyVersion,
    runId,
    policy: policyBody,
    changeNote: policyNote,
  });
  const deposits = await tx
    .insert(cashEntries)
    .values({
      date: asOf,
      kind: "deposit",
      amountGbp: GUARDRAILS.startingCashGbp,
      dedupeKey: STARTING_DEPOSIT_KEY,
      note: say("Starting capital", "初始资金"),
    })
    .onConflictDoNothing()
    .returning({ id: cashEntries.id });
  const text = journalText(ctx.deps.language);
  await tx.insert(journalEntries).values({
    runId,
    date: asOf,
    symbol: null,
    kind: "strategy",
    summary: text.strategy(thesisVersion, policyVersion),
    rationale: [
      thesisBody.summary,
      thesisNote
        ? `**${say("What changed in the thesis", "投资逻辑的修改")}**\n\n${thesisNote}`
        : "",
      `**${say("Risk policy", "风险政策")}**\n\n${policyBody.statement}`,
      policyNote
        ? `**${say("What changed in the policy", "风险政策的修改")}**\n\n${policyNote}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  });
  return {
    status: "done",
    output: { thesisVersion, policyVersion, deposited: deposits.length > 0 },
    memo: [
      text.strategy(thesisVersion, policyVersion),
      deposits.length > 0
        ? say(
            `Deposited the starting capital of £${GUARDRAILS.startingCashGbp.toLocaleString("en-GB")}.`,
            `存入初始资金 £${GUARDRAILS.startingCashGbp.toLocaleString("en-GB")}。`,
          )
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

/** The last step of each kind of meeting. */
export const commitMeeting = { daily, strategy };
