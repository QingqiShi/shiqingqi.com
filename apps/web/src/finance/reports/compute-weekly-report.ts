import { sum } from "d3-array";
import { isIdleSystemAccount } from "../domain/accounts/is-idle-system-account.ts";
import {
  accountBalanceAt,
  netWorthAt,
} from "../domain/balance/net-worth-at.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { startOfYear } from "../domain/dates/start-of-month.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { allocateRounded } from "./allocate-rounded.ts";
import { computeNetWorthTrend } from "./compute-net-worth-trend.ts";
import type { ReportContext } from "./create-report-context.ts";
import { reportWeekOf } from "./report-week-of.ts";
import type { ReportSourceTransaction } from "./types.ts";
import { weekEndsBetween } from "./week-ends-between.ts";
import {
  SPENDING_HISTORY_WEEKS,
  WEEKLY_REPORT_SCHEMA_VERSION,
  type NetWorthComparison,
  type ReportGroup,
  type SpendingLine,
  type TopPayee,
  type TrendPoint,
  type WeeklyReportData,
} from "./weekly-report-data-schema.ts";

const AVERAGE_WEEKS = 4;
const TOP_PAYEES = 5;

/** Days of Transactions before a Report week that its averages and spending history read. */
export const REPORT_LOOKBACK_DAYS =
  7 * Math.max(AVERAGE_WEEKS, SPENDING_HISTORY_WEEKS - 1);

function firstIndexOnOrAfter(
  transactions: readonly ReportSourceTransaction[],
  day: string,
) {
  let low = 0;
  let high = transactions.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (transactions[middle].date < day) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

/** The Accounts that count towards net worth at the end of `day`, with their balances and base amounts that add up to it. */
function countedAt(context: ReportContext, day: string) {
  const epochDay = toEpochDay(day);
  const counted = context.accounts.flatMap((account) => {
    if (account.excludedFromNetWorth) return [];
    if (account.closedOn !== null && day >= account.closedOn) return [];
    const series = context.seriesByAccount.get(account.id);
    if (series === undefined || series.days.length === 0) return [];
    if (series.days[0] > epochDay) return [];
    const balanceMinor = accountBalanceAt(account, series, day);
    return isIdleSystemAccount(account, balanceMinor)
      ? []
      : [{ account, balanceMinor }];
  });
  const netWorthMinor = netWorthAt(
    context.accounts,
    context.seriesByAccount,
    context.fx,
    day,
  );
  const baseAmounts = allocateRounded(
    counted.map(({ account, balanceMinor }) =>
      context.fx.toBase(balanceMinor, account.currency, epochDay),
    ),
    netWorthMinor,
  );
  return {
    netWorthMinor,
    byAccount: new Map(
      counted.map(({ account, balanceMinor }, index) => [
        account.id,
        { balanceMinor, baseMinor: baseAmounts[index] },
      ]),
    ),
  };
}

/** Each Group's total at the end of a week end, keyed by week end and then by Group id. */
type GroupTotalsByWeek = ReadonlyMap<string, ReadonlyMap<string, number>>;

function groupTotalsAt(context: ReportContext, day: string) {
  const { byAccount } = countedAt(context, day);
  const totals = new Map<string, number>();
  for (const account of context.accounts) {
    const counted = byAccount.get(account.id);
    if (counted === undefined) continue;
    totals.set(
      account.groupId,
      (totals.get(account.groupId) ?? 0) + counted.baseMinor,
    );
  }
  return totals;
}

/** Each Group's total at every one of `weekEnds`, so many weeks can share them. */
export function computeGroupTotals(
  context: ReportContext,
  weekEnds: readonly string[],
): GroupTotalsByWeek {
  return new Map(weekEnds.map((day) => [day, groupTotalsAt(context, day)]));
}

/**
 * The balance sheet at the end of `periodEnd`, with every amount also at the
 * end of the week before, and each Group's total at every one of
 * `weekTotals`. An Account that counts at either end is listed, so the
 * changes of the Groups add up to the change in net worth.
 */
function balanceSheet(
  context: ReportContext,
  periodEnd: string,
  weekTotals: readonly ReadonlyMap<string, number>[],
) {
  const current = countedAt(context, periodEnd);
  const previous = countedAt(context, addDays(periodEnd, -7));

  const groups: (ReportGroup & { side: "asset" | "liability" })[] = [];
  for (const group of context.groups) {
    const accounts = context.accounts.flatMap((account) => {
      if (account.groupId !== group.id) return [];
      const now = current.byAccount.get(account.id);
      const before = previous.byAccount.get(account.id);
      if (now === undefined && before === undefined) return [];
      return [
        {
          id: account.id,
          name: account.name,
          institution: account.institution,
          kind: account.kind,
          currency: account.currency,
          ownerName:
            account.ownerMemberId === null
              ? null
              : (context.memberNames.get(account.ownerMemberId) ?? null),
          balanceMinor: now?.balanceMinor ?? 0,
          baseMinor: now?.baseMinor ?? 0,
          previousBaseMinor: before?.baseMinor ?? 0,
          isSystem: account.isSystem,
        },
      ];
    });
    if (accounts.length === 0) continue;
    groups.push({
      side: group.side,
      id: group.id,
      name: group.name,
      totalMinor: sum(accounts, (account) => account.baseMinor),
      previousTotalMinor: sum(accounts, (account) => account.previousBaseMinor),
      history: weekTotals.map((totals) => totals.get(group.id) ?? 0),
      accounts,
    });
  }

  function side(name: "asset" | "liability") {
    const sideGroups = groups
      .filter((group) => group.side === name)
      .map(({ side: _side, ...group }) => group);
    return {
      totalMinor: sum(sideGroups, (group) => group.totalMinor),
      groups: sideGroups,
    };
  }

  return {
    assets: side("asset"),
    liabilities: side("liability"),
    netWorthMinor: current.netWorthMinor,
    previousNetWorthMinor: previous.netWorthMinor,
    groupTotals: new Map(groups.map((group) => [group.id, group.totalMinor])),
  };
}

interface Tally {
  name: string;
  isSystem: boolean;
  current: number;
  previous: number;
}

function addTo(
  tallies: Map<string, Tally>,
  key: string,
  name: string,
  isSystem: boolean,
  amount: number,
  isCurrent: boolean,
) {
  const tally = tallies.get(key) ?? {
    name,
    isSystem,
    current: 0,
    previous: 0,
  };
  if (isCurrent) {
    tally.current += amount;
  } else {
    tally.previous += amount;
  }
  tallies.set(key, tally);
}

function averageOf(previous: number) {
  return Math.round(previous / AVERAGE_WEEKS) || 0;
}

function spendingLines(tallies: Map<string, Tally>): SpendingLine[] {
  return [...tallies.entries()]
    .map(([key, tally]) => {
      const averageMinor = averageOf(tally.previous);
      return {
        id: key === "" ? null : key,
        name: tally.name,
        isSystem: tally.isSystem,
        amountMinor: tally.current,
        averageMinor,
        changeMinor: tally.current - averageMinor,
      };
    })
    .filter((line) => line.amountMinor !== 0 || line.averageMinor !== 0)
    .sort(
      (a, b) =>
        b.amountMinor - a.amountMinor ||
        b.averageMinor - a.averageMinor ||
        a.name.localeCompare(b.name),
    );
}

function weekActivity(
  context: ReportContext,
  periodStart: string,
  periodEnd: string,
) {
  const averageFrom = addDays(periodStart, -7 * AVERAGE_WEEKS);
  const historyFrom = addDays(periodStart, -7 * (SPENDING_HISTORY_WEEKS - 1));
  const historyStartDay = toEpochDay(historyFrom);
  const historyEnds = weekEndsBetween(historyFrom, periodEnd);
  const weekTotals = new Array<number>(SPENDING_HISTORY_WEEKS).fill(0);
  const transactions = context.transactions;
  const byCategory = new Map<string, Tally>();
  const byMember = new Map<string, Tally>();
  const byPayee = new Map<string, TopPayee>();
  let current = 0;
  let previous = 0;
  let incomeMinor = 0;
  let transactionCount = 0;
  let reviewCount = 0;

  for (
    let index = firstIndexOnOrAfter(
      transactions,
      addDays(periodStart, -REPORT_LOOKBACK_DAYS),
    );
    index < transactions.length && transactions[index].date <= periodEnd;
    index++
  ) {
    const transaction = transactions[index];
    const isCurrent = transaction.date >= periodStart;
    if (isCurrent && transaction.inReview) reviewCount++;
    if (transaction.status !== "posted") continue;
    if (isCurrent) transactionCount++;
    if (transaction.kind === "income" && isCurrent) {
      incomeMinor += transaction.amountMinor;
    }
    if (transaction.kind !== "expense") continue;

    const spent = -transaction.amountMinor;
    if (transaction.date >= historyFrom) {
      const week = Math.floor(
        (toEpochDay(transaction.date) - historyStartDay) / 7,
      );
      weekTotals[week] += spent;
    }
    if (transaction.date < averageFrom) continue;
    if (isCurrent) {
      current += spent;
    } else {
      previous += spent;
    }
    const root =
      transaction.categoryId === null
        ? undefined
        : context.rootCategoryOf.get(transaction.categoryId);
    addTo(
      byCategory,
      root?.id ?? "",
      root?.name ?? "",
      root?.isSystem ?? false,
      spent,
      isCurrent,
    );
    const memberId = transaction.memberId ?? "";
    addTo(
      byMember,
      memberId,
      context.memberNames.get(memberId) ?? "",
      false,
      spent,
      isCurrent,
    );
    if (isCurrent && transaction.payeeId !== null) {
      const payee = byPayee.get(transaction.payeeId) ?? {
        id: transaction.payeeId,
        name: context.payeeNames.get(transaction.payeeId) ?? "",
        amountMinor: 0,
        count: 0,
      };
      payee.amountMinor += spent;
      payee.count++;
      byPayee.set(transaction.payeeId, payee);
    }
  }

  const averageMinor = averageOf(previous);
  return {
    spending: {
      totalMinor: current,
      averageMinor,
      changeMinor: current - averageMinor,
      byCategory: spendingLines(byCategory),
      byMember: spendingLines(byMember),
      history: historyEnds.flatMap((end, week) =>
        context.firstDay !== null && end < context.firstDay
          ? []
          : [{ periodEnd: end, totalMinor: weekTotals[week] }],
      ),
    },
    incomeMinor,
    topPayees: [...byPayee.values()]
      .filter((payee) => payee.amountMinor > 0)
      .sort(
        (a, b) => b.amountMinor - a.amountMinor || a.name.localeCompare(b.name),
      )
      .slice(0, TOP_PAYEES),
    transactionCount,
    reviewCount,
  };
}

/**
 * The weekly Report for the week that holds `weekDay`, from
 * an indexed source. Balances follow the balance engine, so the net worth
 * equals the app's on that day; account amounts add up to their Group, the
 * Groups to their side, and the sides to the net worth, to the penny.
 * Pass `shared.trend` (from `computeNetWorthTrend` up to a later week) and
 * `shared.groupTotals` (from `computeGroupTotals` over its week ends) to
 * reuse them across many weeks.
 */
export function computeWeeklyReport(
  context: ReportContext,
  weekDay: string,
  {
    trend,
    groupTotals,
  }: { trend?: readonly TrendPoint[]; groupTotals?: GroupTotalsByWeek } = {},
): WeeklyReportData {
  const { periodStart, periodEnd } = reportWeekOf(weekDay);
  const reportTrend = (
    trend ?? computeNetWorthTrend(context, periodEnd)
  ).filter((point) => point.day <= periodEnd);
  const sheet = balanceSheet(
    context,
    periodEnd,
    reportTrend.map(
      (point) =>
        groupTotals?.get(point.day) ?? groupTotalsAt(context, point.day),
    ),
  );

  function compareWith(
    day: string,
    netWorthMinor = netWorthAt(
      context.accounts,
      context.seriesByAccount,
      context.fx,
      day,
    ),
  ): NetWorthComparison {
    return {
      day,
      netWorthMinor,
      changeMinor: sheet.netWorthMinor - netWorthMinor,
    };
  }

  const groupNets = context.families.flatMap((family) => {
    const totals = family.groupIds.flatMap((id) => {
      const total = sheet.groupTotals.get(id);
      return total === undefined ? [] : [total];
    });
    if (totals.length === 0) return [];
    return [
      {
        name: family.name,
        groupIds: family.groupIds,
        valueMinor: totals.reduce((sum, total) => sum + total, 0),
        holdsProperty: family.holdsProperty,
      },
    ];
  });
  const propertyNets = groupNets.filter((family) => family.holdsProperty);

  return {
    schemaVersion: WEEKLY_REPORT_SCHEMA_VERSION,
    periodStart,
    periodEnd,
    baseCurrency: context.baseCurrency,
    balanceSheet: {
      assets: sheet.assets,
      liabilities: sheet.liabilities,
      netWorthMinor: sheet.netWorthMinor,
    },
    comparisons: {
      previousWeek: compareWith(
        addDays(periodEnd, -7),
        sheet.previousNetWorthMinor,
      ),
      fourWeeksAgo: compareWith(addDays(periodEnd, -28)),
      yearStart: compareWith(addDays(startOfYear(periodEnd), -1)),
    },
    groupNets: groupNets.map(({ holdsProperty: _holds, ...family }) => family),
    propertyNetMinor:
      propertyNets.length === 0
        ? null
        : propertyNets.reduce((sum, family) => sum + family.valueMinor, 0),
    ...weekActivity(context, periodStart, periodEnd),
    trend: reportTrend,
  };
}
