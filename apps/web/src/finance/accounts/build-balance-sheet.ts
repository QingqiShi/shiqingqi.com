import {
  balanceCheckOf,
  ledgerBalanceAt,
  type BalanceCheck,
} from "../bank/balance-check-of.ts";
import { isIdleSystemAccount } from "../domain/accounts/is-idle-system-account.ts";
import type { BalanceSeries } from "../domain/balance/compute-balance-days.ts";
import type { FxIndex } from "../domain/balance/create-fx-index.ts";
import { accountBalanceAt } from "../domain/balance/net-worth-at.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import type {
  AccountGroupRow,
  AccountRow,
  BankLinkRow,
  MemberRow,
  ValuationRow,
} from "../sync/row-schemas.ts";

/** One account as the Net worth list shows it. */
export interface AccountLine {
  account: AccountRow;
  /** The balance at the end of the day, in the account's currency. */
  balance: number;
  /** The same balance in the base currency, rounded. */
  baseBalance: number;
  /** Why the account sits behind "Show hidden", or null. */
  hidden: "closed" | "excluded" | null;
  ownerName: string | null;
  /** The day of the latest Valuation, or null. */
  lastValuationOn: string | null;
  /** What is left to spend on a credit account with a limit, or null. */
  available: number | null;
  bankLink: BankLinkRow | null;
  /** The Bank link's balance check when it found a difference, or null. */
  balanceCheck: BalanceCheck | null;
}

interface GroupSection {
  group: AccountGroupRow;
  lines: AccountLine[];
  /** The counted accounts' balances in the base currency, rounded once. */
  subtotal: number;
}

export interface BalanceSheet {
  sections: GroupSection[];
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface BalanceSheetInput {
  groups: readonly AccountGroupRow[];
  accounts: readonly AccountRow[];
  members: readonly MemberRow[];
  latestValuations: ReadonlyMap<string, ValuationRow>;
  bankLinks: readonly BankLinkRow[];
  seriesByAccount: ReadonlyMap<string, BalanceSeries>;
  fx: FxIndex;
  day: string;
}

/**
 * The balance sheet on `day`: each Group with its accounts in order, the
 * Group subtotal, and the asset, liability and net-worth totals. Closed and
 * excluded accounts are listed but not counted, the same as `netWorthAt`.
 * In transit is left out while nothing is on its way.
 */
export function buildBalanceSheet(input: BalanceSheetInput): BalanceSheet {
  const epochDay = toEpochDay(input.day);
  const memberNames = new Map(input.members.map((m) => [m.id, m.name]));
  const linkByAccount = new Map(
    input.bankLinks.map((link) => [link.accountId, link]),
  );
  const linesByGroup = new Map<string, AccountLine[]>();
  const rawByGroup = new Map<string, number>();

  for (const account of input.accounts) {
    const closed = account.closedOn !== null && input.day >= account.closedOn;
    const series = input.seriesByAccount.get(account.id);
    const balance = accountBalanceAt(account, series, input.day);
    if (isIdleSystemAccount(account, balance)) continue;
    const rawBase = input.fx.toBase(balance, account.currency, epochDay);
    const bankLink = linkByAccount.get(account.id) ?? null;
    const hidden = closed
      ? "closed"
      : account.excludedFromNetWorth
        ? "excluded"
        : null;
    const line: AccountLine = {
      account,
      balance,
      baseBalance: Math.round(rawBase) || 0,
      hidden,
      ownerName:
        account.ownerMemberId === null
          ? null
          : (memberNames.get(account.ownerMemberId) ?? null),
      lastValuationOn: input.latestValuations.get(account.id)?.on ?? null,
      available:
        account.kind === "credit" && account.creditLimitMinor !== null
          ? account.creditLimitMinor + balance
          : null,
      bankLink,
      balanceCheck:
        bankLink &&
        balanceCheckOf(bankLink, (day) => ledgerBalanceAt(series, day)),
    };
    const lines = linesByGroup.get(account.groupId) ?? [];
    lines.push(line);
    linesByGroup.set(account.groupId, lines);
    if (hidden === null) {
      rawByGroup.set(
        account.groupId,
        (rawByGroup.get(account.groupId) ?? 0) + rawBase,
      );
    }
  }

  let assets = 0;
  let liabilities = 0;
  const sections: GroupSection[] = [];
  for (const group of input.groups) {
    const raw = rawByGroup.get(group.id) ?? 0;
    if (group.side === "asset") assets += raw;
    else liabilities += raw;
    sections.push({
      group,
      lines: linesByGroup.get(group.id) ?? [],
      subtotal: Math.round(raw) || 0,
    });
  }
  return {
    sections,
    assets: Math.round(assets) || 0,
    liabilities: Math.round(liabilities) || 0,
    netWorth: Math.round(assets + liabilities) || 0,
  };
}
