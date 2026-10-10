import {
  balanceSeriesFromRows,
  type BalanceDayRow,
  type BalanceSeries,
} from "../domain/balance/compute-balance-days.ts";
import {
  createFxIndex,
  type FxIndex,
} from "../domain/balance/create-fx-index.ts";
import { fromEpochDay } from "../domain/dates/to-epoch-day.ts";
import type {
  ReportSource,
  ReportSourceAccount,
  ReportSourceGroup,
  ReportSourceTransaction,
} from "./types.ts";

/** Groups that make one bar of the per-group chart. */
interface GroupFamily {
  name: string;
  groupIds: string[];
  holdsProperty: boolean;
}

/** A `ReportSource` indexed once, so many weeks can be read from it cheaply. */
export interface ReportContext {
  baseCurrency: string;
  fx: FxIndex;
  seriesByAccount: ReadonlyMap<string, BalanceSeries>;
  /** Asset Groups first, each side in its position order. */
  groups: readonly ReportSourceGroup[];
  /** In Group order, then position order. */
  accounts: readonly ReportSourceAccount[];
  families: readonly GroupFamily[];
  /** The Accounts of the families that hold property; empty when there is none. */
  propertyAccounts: readonly ReportSourceAccount[];
  /** The first day any counted Account has a balance; null when none has. */
  firstDay: string | null;
  /** The top-level Category of each Category. */
  rootCategoryOf: ReadonlyMap<
    string,
    { id: string; name: string; isSystem: boolean }
  >;
  payeeNames: ReadonlyMap<string, string>;
  memberNames: ReadonlyMap<string, string>;
  transactions: readonly ReportSourceTransaction[];
}

function sortGroups(groups: readonly ReportSourceGroup[]) {
  return [...groups].sort(
    (a, b) =>
      (a.side === b.side ? 0 : a.side === "asset" ? -1 : 1) ||
      a.position - b.position ||
      a.name.localeCompare(b.name),
  );
}

/**
 * Pairs each liability Group with the asset Group whose name starts its
 * name (不动产负债 with 不动产, "Property debt" with "Property"), so the
 * per-group chart shows property net of its mortgage. Other liability
 * Groups stand alone.
 */
function groupFamilies(
  groups: readonly ReportSourceGroup[],
  accounts: readonly ReportSourceAccount[],
): GroupFamily[] {
  const assetGroups = groups.filter((group) => group.side === "asset");
  const families = new Map<string, GroupFamily>(
    assetGroups.map((group) => [
      group.id,
      { name: group.name, groupIds: [group.id], holdsProperty: false },
    ]),
  );
  const standalone: GroupFamily[] = [];
  for (const group of groups) {
    if (group.side !== "liability") continue;
    const owner = assetGroups
      .filter((asset) => group.name.startsWith(asset.name))
      .sort((a, b) => b.name.length - a.name.length)
      .at(0);
    const family = owner && families.get(owner.id);
    if (family) {
      family.groupIds.push(group.id);
    } else {
      standalone.push({
        name: group.name,
        groupIds: [group.id],
        holdsProperty: false,
      });
    }
  }
  const all = [...families.values(), ...standalone];
  for (const family of all) {
    family.holdsProperty = accounts.some(
      (account) =>
        account.kind === "property" &&
        family.groupIds.includes(account.groupId),
    );
  }
  return all;
}

function rootCategories(source: ReportSource) {
  const byId = new Map(source.categories.map((row) => [row.id, row]));
  const roots = new Map<
    string,
    { id: string; name: string; isSystem: boolean }
  >();
  for (const category of source.categories) {
    let root = category;
    const seen = new Set([root.id]);
    while (root.parentId !== null) {
      const parent = byId.get(root.parentId);
      if (!parent || seen.has(parent.id)) break;
      seen.add(parent.id);
      root = parent;
    }
    roots.set(category.id, {
      id: root.id,
      name: root.name,
      isSystem: root.isSystem,
    });
  }
  return roots;
}

export function createReportContext(source: ReportSource): ReportContext {
  const groups = sortGroups(source.groups);
  const groupOrder = new Map(groups.map((group, index) => [group.id, index]));
  const accounts = source.accounts
    .filter((account) => groupOrder.has(account.groupId))
    .sort(
      (a, b) =>
        (groupOrder.get(a.groupId) ?? 0) - (groupOrder.get(b.groupId) ?? 0) ||
        a.position - b.position ||
        a.name.localeCompare(b.name),
    );

  const rowsByAccount = new Map<string, BalanceDayRow[]>();
  for (const row of source.balanceDays) {
    const rows = rowsByAccount.get(row.accountId) ?? [];
    rows.push(row);
    rowsByAccount.set(row.accountId, rows);
  }
  const seriesByAccount = new Map<string, BalanceSeries>();
  let firstEpochDay = Number.POSITIVE_INFINITY;
  for (const account of accounts) {
    const rows = rowsByAccount.get(account.id);
    if (!rows) continue;
    const series = balanceSeriesFromRows(rows);
    seriesByAccount.set(account.id, series);
    if (!account.excludedFromNetWorth && series.days.length > 0) {
      firstEpochDay = Math.min(firstEpochDay, series.days[0]);
    }
  }

  const families = groupFamilies(groups, accounts);
  const propertyGroupIds = new Set(
    families
      .filter((family) => family.holdsProperty)
      .flatMap((family) => family.groupIds),
  );

  return {
    baseCurrency: source.baseCurrency,
    fx: createFxIndex(source.fxRates, source.baseCurrency),
    seriesByAccount,
    groups,
    accounts,
    families,
    propertyAccounts: accounts.filter((account) =>
      propertyGroupIds.has(account.groupId),
    ),
    firstDay: Number.isFinite(firstEpochDay)
      ? fromEpochDay(firstEpochDay)
      : null,
    rootCategoryOf: rootCategories(source),
    payeeNames: new Map(source.payees.map((row) => [row.id, row.name])),
    memberNames: new Map(source.members.map((row) => [row.id, row.name])),
    transactions: source.transactions,
  };
}
