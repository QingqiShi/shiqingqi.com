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
import {
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

function balanceSheet(context: ReportContext, periodEnd: string) {
  const epochDay = toEpochDay(periodEnd);
  const counted = context.accounts.filter((account) => {
    if (account.excludedFromNetWorth) return false;
    if (account.closedOn !== null && periodEnd >= account.closedOn) {
      return false;
    }
    const series = context.seriesByAccount.get(account.id);
    return series !== undefined && series.days.length > 0
      ? series.days[0] <= epochDay
      : false;
  });
  const balances = counted.map((account) =>
    accountBalanceAt(
      account,
      context.seriesByAccount.get(account.id),
      periodEnd,
    ),
  );
  const netWorthMinor = netWorthAt(
    context.accounts,
    context.seriesByAccount,
    context.fx,
    periodEnd,
  );
  const baseAmounts = allocateRounded(
    counted.map((account, index) =>
      context.fx.toBase(balances[index], account.currency, epochDay),
    ),
    netWorthMinor,
  );

  const groups: (ReportGroup & { side: "asset" | "liability" })[] = [];
  for (const group of context.groups) {
    const accounts = counted.flatMap((account, index) =>
      account.groupId === group.id
        ? [
            {
              id: account.id,
              name: account.name,
              institution: account.institution,
              kind: account.kind,
              currency: account.currency,
              balanceMinor: balances[index],
              baseMinor: baseAmounts[index],
            },
          ]
        : [],
    );
    if (accounts.length === 0) continue;
    groups.push({
      side: group.side,
      id: group.id,
      name: group.name,
      totalMinor: accounts.reduce((sum, account) => sum + account.baseMinor, 0),
      accounts,
    });
  }

  function side(name: "asset" | "liability") {
    const sideGroups = groups
      .filter((group) => group.side === name)
      .map(({ side: _side, ...group }) => group);
    return {
      totalMinor: sideGroups.reduce((sum, group) => sum + group.totalMinor, 0),
      groups: sideGroups,
    };
  }

  return {
    assets: side("asset"),
    liabilities: side("liability"),
    netWorthMinor,
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
    let index = firstIndexOnOrAfter(transactions, averageFrom);
    index < transactions.length && transactions[index].date <= periodEnd;
    index++
  ) {
    const transaction = transactions[index];
    const isCurrent = transaction.date >= periodStart;
    if (isCurrent && transaction.needsReview) reviewCount++;
    if (transaction.status !== "posted") continue;
    if (isCurrent) transactionCount++;
    if (transaction.kind === "income" && isCurrent) {
      incomeMinor += transaction.amountMinor;
    }
    if (transaction.kind !== "expense") continue;

    const spent = -transaction.amountMinor;
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
 * Pass `trend` (from `computeNetWorthTrend` up to a later week) to reuse
 * one trend across many weeks.
 */
export function computeWeeklyReport(
  context: ReportContext,
  weekDay: string,
  trend?: readonly TrendPoint[],
): WeeklyReportData {
  const { periodStart, periodEnd } = reportWeekOf(weekDay);
  const sheet = balanceSheet(context, periodEnd);

  function compareWith(day: string): NetWorthComparison {
    const netWorthMinor = netWorthAt(
      context.accounts,
      context.seriesByAccount,
      context.fx,
      day,
    );
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
      previousWeek: compareWith(addDays(periodEnd, -7)),
      fourWeeksAgo: compareWith(addDays(periodEnd, -28)),
      yearStart: compareWith(addDays(startOfYear(periodEnd), -1)),
    },
    groupNets: groupNets.map(({ holdsProperty: _holds, ...family }) => family),
    propertyNetMinor:
      propertyNets.length === 0
        ? null
        : propertyNets.reduce((sum, family) => sum + family.valueMinor, 0),
    ...weekActivity(context, periodStart, periodEnd),
    trend: (trend ?? computeNetWorthTrend(context, periodEnd)).filter(
      (point) => point.day <= periodEnd,
    ),
  };
}
