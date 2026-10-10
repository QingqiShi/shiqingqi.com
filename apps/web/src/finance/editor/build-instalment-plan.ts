import type { FxIndex } from "../domain/balance/create-fx-index.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { addMonths } from "../domain/dates/add-months.ts";
import { parseDay, toEpochDay } from "../domain/dates/to-epoch-day.ts";
import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import type {
  AccountGroupRow,
  AccountRow,
  EntryRow,
  TransactionRow,
} from "../sync/row-schemas.ts";
import { splitEntries } from "./split-entries.ts";

export const INSTALMENT_MONTHS = { min: 2, max: 60 } as const;

export interface InstalmentPlanInput {
  /** A posted expense with one Entry: the purchase. */
  transaction: TransactionRow;
  entries: readonly EntryRow[];
  tagIds: readonly string[];
  months: number;
  /** The fee in the paying account's currency; 0 for none. */
  feeMinor: number;
  accountById: ReadonlyMap<
    string,
    Pick<AccountRow, "currency" | "ownerMemberId">
  >;
  /** Live accounts, to find the Group loans already go in. */
  accounts: readonly Pick<AccountRow, "groupId" | "kind">[];
  groups: readonly Pick<AccountGroupRow, "id" | "side" | "position">[];
  /** The names the new rows get, in the reader's language. */
  names: { account: string; rule: string; group: string };
  baseCurrency: string;
  fx: FxIndex;
  createId: () => string;
}

interface InstalmentPlan {
  /** The amount of each payment after the first, in the paying account's currency. */
  paymentMinor: number;
  /** The first payment: the purchase itself. It takes the pennies that do not divide evenly. */
  firstPaymentMinor: number;
  totalMinor: number;
  lastPaymentOn: string;
  loanAccountId: string;
  mutations: LocalMutationInput[];
  undo: LocalMutationInput[];
}

/** True for an expense the editor can turn into an instalment plan. */
export function canPayInInstalments(
  transaction: TransactionRow,
  entries: readonly EntryRow[],
) {
  return (
    transaction.kind === "expense" &&
    transaction.status === "posted" &&
    transaction.ruleId === null &&
    transaction.amountMinor < 0 &&
    entries.length === 1 &&
    entries[0].amountMinor < 0
  );
}

/**
 * Turns a purchase into an instalment plan, as MoneyThings' 分期付款 does:
 * a loan account (left out of net worth) that starts at the price plus the
 * fee, the purchase as the first monthly payment, and a Rule that posts the
 * other payments. Each payment is spending from the paying account and pays
 * the loan down by the same amount, so the loan ends at zero.
 */
export function buildInstalmentPlan(
  input: InstalmentPlanInput,
): InstalmentPlan | null {
  const { transaction, months, createId } = input;
  const { main } = splitEntries(input.entries);
  if (!main || !canPayInInstalments(transaction, input.entries)) return null;
  if (
    !Number.isInteger(months) ||
    months < INSTALMENT_MONTHS.min ||
    months > INSTALMENT_MONTHS.max ||
    !Number.isInteger(input.feeMinor) ||
    input.feeMinor < 0
  ) {
    return null;
  }
  const account = input.accountById.get(main.accountId);
  if (!account) return null;

  const totalMinor = -main.amountMinor + input.feeMinor;
  const paymentMinor = Math.floor(totalMinor / months);
  const firstPaymentMinor = totalMinor - paymentMinor * (months - 1);
  const toBase = (minor: number, day: string) =>
    account.currency === input.baseCurrency
      ? minor
      : Math.round(input.fx.toBase(minor, account.currency, toEpochDay(day)));

  const mutations: LocalMutationInput[] = [];
  const undo: LocalMutationInput[] = [];

  const loanGroup =
    input.groups.find((group) =>
      input.accounts.some(
        (candidate) =>
          candidate.kind === "loan" && candidate.groupId === group.id,
      ),
    ) ?? input.groups.find((group) => group.side === "liability");
  let groupId = loanGroup?.id;
  if (groupId === undefined) {
    groupId = createId();
    mutations.push({
      name: "upsertGroup",
      args: {
        id: groupId,
        name: input.names.group,
        side: "liability",
        position:
          Math.max(-1, ...input.groups.map((group) => group.position)) + 1,
      },
    });
  }

  const loanAccountId = createId();
  mutations.push({
    name: "upsertAccount",
    args: {
      id: loanAccountId,
      groupId,
      ownerMemberId: account.ownerMemberId,
      name: input.names.account,
      institution: "",
      kind: "loan",
      currency: account.currency,
      excludedFromNetWorth: true,
      closedOn: null,
      position: input.accounts.filter(
        (candidate) => candidate.groupId === groupId,
      ).length,
      creditLimitMinor: null,
      statementDay: null,
      paymentDueDay: null,
      defaultPaymentAccountId: null,
    },
  });

  const valuationId = createId();
  mutations.push({
    name: "putValuation",
    args: {
      id: valuationId,
      accountId: loanAccountId,
      on: addDays(transaction.date, -1),
      amountMinor: -totalMinor,
    },
  });

  mutations.push({
    name: "updateTransaction",
    args: {
      id: transaction.id,
      patch: {
        amountMinor: toBase(-firstPaymentMinor, transaction.date),
        entries: [
          {
            id: main.id,
            accountId: main.accountId,
            amountMinor: -firstPaymentMinor,
            fxRate: main.fxRate,
          },
          {
            id: createId(),
            accountId: loanAccountId,
            amountMinor: firstPaymentMinor,
            fxRate: main.fxRate,
          },
        ],
      },
    },
  });

  const ruleId = createId();
  const startsOn = addMonths(transaction.date, 1);
  const lastPaymentOn = addMonths(transaction.date, months - 1);
  mutations.push({
    name: "upsertRule",
    args: {
      id: ruleId,
      name: input.names.rule,
      unit: "month",
      interval: 1,
      dayOfMonth: parseDay(transaction.date).dayOfMonth,
      weekday: null,
      monthOfYear: null,
      startsOn,
      endsOn: lastPaymentOn,
      nextOn: startsOn,
      autoPost: true,
      paused: false,
      template: {
        kind: "expense",
        amountMinor: toBase(-paymentMinor, startsOn),
        categoryId: transaction.categoryId,
        payeeId: transaction.payeeId,
        memberId: transaction.memberId,
        note: transaction.note,
        entries: [
          { accountId: main.accountId, amountMinor: -paymentMinor },
          { accountId: loanAccountId, amountMinor: paymentMinor },
        ],
        tagIds: [...input.tagIds],
      },
    },
  });

  undo.push(
    { name: "upsertRule", args: { id: ruleId, deleted: true } },
    {
      name: "updateTransaction",
      args: {
        id: transaction.id,
        patch: {
          amountMinor: transaction.amountMinor,
          entries: [
            {
              id: main.id,
              accountId: main.accountId,
              amountMinor: main.amountMinor,
              fxRate: main.fxRate,
            },
          ],
        },
      },
    },
    { name: "deleteValuation", args: { id: valuationId } },
    { name: "upsertAccount", args: { id: loanAccountId, deleted: true } },
  );
  if (loanGroup === undefined) {
    undo.push({ name: "upsertGroup", args: { id: groupId, deleted: true } });
  }

  return {
    paymentMinor,
    firstPaymentMinor,
    totalMinor,
    lastPaymentOn,
    loanAccountId,
    mutations,
    undo,
  };
}
