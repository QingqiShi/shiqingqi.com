import { addMonths } from "../domain/dates/add-months.ts";
import { startOfMonth } from "../domain/dates/start-of-month.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import type { AnalyticsIndex } from "./types.ts";

interface IndexTransaction {
  id: string;
  kind: string;
  status: string;
  date: string;
  amountMinor: number;
  categoryId: string | null;
  payeeId: string | null;
  memberId: string | null;
  deletedAt: string | null;
}

interface IndexMonthTotal {
  month: string;
  kind: string;
  categoryId: string;
  memberId: string | null;
  amountMinor: number;
  count: number;
  deletedAt: string | null;
}

export interface AnalyticsIndexSource {
  /** In any order; newest first is cheapest. */
  transactions: readonly IndexTransaction[];
  transactionTags: Iterable<{
    transactionId: string;
    tagId: string;
    deletedAt: string | null;
  }>;
  /** Every Category, deleted and archived ones too: old Transactions still point at them. */
  categories: readonly { id: string; parentId: string | null }[];
  payees: Iterable<{ id: string }>;
  members: Iterable<{ id: string }>;
  tags: Iterable<{ id: string }>;
  monthTotals: Iterable<IndexMonthTotal>;
  /** The first Transaction day the Replica holds, or null when it holds every one. */
  transactionsFrom: string | null;
}

function indexOf(ids: Iterable<{ id: string }>) {
  const list: string[] = [];
  const map = new Map<string, number>();
  for (const { id } of ids) {
    if (map.has(id)) continue;
    map.set(id, list.length);
    list.push(id);
  }
  return { list, map };
}

/** The first day served by Transactions: the 1st of the first whole month inside the window. */
function rawStartOf(transactionsFrom: string | null) {
  if (transactionsFrom === null) return null;
  const month = startOfMonth(transactionsFrom);
  return month === transactionsFrom ? month : addMonths(month, 1);
}

/**
 * Builds the columnar index once per change to the Replica. Expected,
 * deleted and transfer Transactions are left out. Before the Replica window
 * each Category × Member month total becomes one row on the month's 1st,
 * so long ranges still add up, without Payees or Tags.
 */
export function buildAnalyticsIndex(
  source: AnalyticsIndexSource,
): AnalyticsIndex {
  const categoryIndex = indexOf(source.categories);
  const payeeIndex = indexOf(source.payees);
  const memberIndex = indexOf(source.members);
  const tagIndex = indexOf(source.tags);
  const none = categoryIndex.list.length;

  const categoryParents = new Int32Array(none + 1).fill(-1);
  for (const category of source.categories) {
    const index = categoryIndex.map.get(category.id);
    const parent =
      category.parentId === null
        ? undefined
        : categoryIndex.map.get(category.parentId);
    if (index !== undefined && parent !== undefined && parent !== index) {
      categoryParents[index] = parent;
    }
  }

  const rawStart = rawStartOf(source.transactionsFrom);
  const epochOf = new Map<string, number>();
  const epoch = (day: string) => {
    let value = epochOf.get(day);
    if (value === undefined) {
      value = toEpochDay(day);
      epochOf.set(day, value);
    }
    return value;
  };

  const kept: IndexTransaction[] = [];
  for (const row of source.transactions) {
    if (row.deletedAt !== null || row.status !== "posted") continue;
    if (row.kind !== "expense" && row.kind !== "income") continue;
    if (rawStart !== null && row.date < rawStart) continue;
    kept.push(row);
  }
  const totals: IndexMonthTotal[] = [];
  if (rawStart !== null) {
    for (const row of source.monthTotals) {
      if (row.deletedAt !== null || row.month >= rawStart) continue;
      if (row.kind !== "expense" && row.kind !== "income") continue;
      totals.push(row);
    }
  }

  const length = kept.length + totals.length;
  const order = new Int32Array(length);
  const rowDays = new Int32Array(length);
  for (let i = 0; i < totals.length; i++) rowDays[i] = epoch(totals[i].month);
  for (let i = 0; i < kept.length; i++) {
    rowDays[totals.length + i] = epoch(kept[i].date);
  }
  for (let i = 0; i < length; i++) order[i] = i;
  let ascending = true;
  let descending = true;
  for (let i = totals.length + 1; i < length; i++) {
    if (rowDays[i] < rowDays[i - 1]) ascending = false;
    if (rowDays[i] > rowDays[i - 1]) descending = false;
  }
  if (descending && !ascending) {
    order.subarray(totals.length).reverse();
  }
  if (!ascending && !descending) {
    order.sort((a, b) => rowDays[a] - rowDays[b] || a - b);
  } else if (totals.length > 0) {
    const head = Array.from(order.subarray(0, totals.length)).sort(
      (a, b) => rowDays[a] - rowDays[b] || a - b,
    );
    order.set(head);
  }

  const tagsByTransaction = new Map<string, number[]>();
  for (const link of source.transactionTags) {
    if (link.deletedAt !== null) continue;
    const tag = tagIndex.map.get(link.tagId);
    if (tag === undefined) continue;
    const list = tagsByTransaction.get(link.transactionId);
    if (list) list.push(tag);
    else tagsByTransaction.set(link.transactionId, [tag]);
  }

  const days = new Int32Array(length);
  const amounts = new Float64Array(length);
  const kinds = new Uint8Array(length);
  const categories = new Int32Array(length);
  const payees = new Int32Array(length);
  const members = new Int32Array(length);
  const counts = new Int32Array(length);
  const aggregated = new Uint8Array(length);
  const transactionIds = new Array<string>(length);
  const tagOffsets = new Int32Array(length + 1);
  const tagList: number[] = [];
  const spendingByCategory = new Float64Array(none + 1);
  const incomeByCategory = new Float64Array(none + 1);

  for (let i = 0; i < length; i++) {
    const at = order[i];
    days[i] = rowDays[at];
    tagOffsets[i] = tagList.length;
    let categoryId: string | null;
    let memberId: string | null;
    if (at < totals.length) {
      const total = totals[at];
      amounts[i] = total.amountMinor;
      kinds[i] = total.kind === "income" ? 1 : 0;
      categoryId = total.categoryId;
      memberId = total.memberId;
      payees[i] = -1;
      counts[i] = total.count;
      aggregated[i] = 1;
      transactionIds[i] = "";
    } else {
      const row = kept[at - totals.length];
      amounts[i] = row.amountMinor;
      kinds[i] = row.kind === "income" ? 1 : 0;
      categoryId = row.categoryId;
      memberId = row.memberId;
      payees[i] =
        row.payeeId === null ? -1 : (payeeIndex.map.get(row.payeeId) ?? -1);
      counts[i] = 1;
      transactionIds[i] = row.id;
      const tags = tagsByTransaction.get(row.id);
      if (tags) for (const tag of tags) tagList.push(tag);
    }
    const category =
      categoryId === null ? none : (categoryIndex.map.get(categoryId) ?? none);
    categories[i] = category;
    members[i] = memberId === null ? -1 : (memberIndex.map.get(memberId) ?? -1);
    if (kinds[i] === 1) incomeByCategory[category] += amounts[i];
    else spendingByCategory[category] -= amounts[i];
  }
  tagOffsets[length] = tagList.length;

  return {
    length,
    days,
    amounts,
    kinds,
    categories,
    payees,
    members,
    counts,
    aggregated,
    transactionIds,
    tagOffsets,
    tagIndexes: Int32Array.from(tagList),
    categoryIds: categoryIndex.list,
    categoryParents,
    payeeIds: payeeIndex.list,
    memberIds: memberIndex.list,
    tagIds: tagIndex.list,
    spendingByCategory,
    incomeByCategory,
    rawFrom: rawStart === null ? null : epoch(rawStart),
    firstDay: length > 0 ? days[0] : null,
    lastDay: length > 0 ? days[length - 1] : null,
  };
}
