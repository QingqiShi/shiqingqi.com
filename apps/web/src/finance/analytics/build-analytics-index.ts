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

/**
 * Builds the columnar index once per change to the Replica. Expected,
 * deleted and transfer Transactions are left out.
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
    kept.push(row);
  }

  const order = new Int32Array(kept.length);
  const rowDays = new Int32Array(kept.length);
  for (let i = 0; i < kept.length; i++) {
    rowDays[i] = epoch(kept[i].date);
    order[i] = i;
  }
  let ascending = true;
  let descending = true;
  for (let i = 1; i < kept.length; i++) {
    if (rowDays[i] < rowDays[i - 1]) ascending = false;
    if (rowDays[i] > rowDays[i - 1]) descending = false;
  }
  if (descending && !ascending) order.reverse();
  if (!ascending && !descending) {
    order.sort((a, b) => rowDays[a] - rowDays[b] || a - b);
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

  const days = new Int32Array(kept.length);
  const amounts = new Float64Array(kept.length);
  const kinds = new Uint8Array(kept.length);
  const categories = new Int32Array(kept.length);
  const payees = new Int32Array(kept.length);
  const members = new Int32Array(kept.length);
  const transactionIds = new Array<string>(kept.length);
  const tagOffsets = new Int32Array(kept.length + 1);
  const tagList: number[] = [];
  const spendingByCategory = new Float64Array(none + 1);
  const incomeByCategory = new Float64Array(none + 1);

  for (let i = 0; i < kept.length; i++) {
    const at = order[i];
    days[i] = rowDays[at];
    tagOffsets[i] = tagList.length;
    const row = kept[at];
    amounts[i] = row.amountMinor;
    kinds[i] = row.kind === "income" ? 1 : 0;
    payees[i] =
      row.payeeId === null ? -1 : (payeeIndex.map.get(row.payeeId) ?? -1);
    transactionIds[i] = row.id;
    const tags = tagsByTransaction.get(row.id);
    if (tags) for (const tag of tags) tagList.push(tag);
    const category =
      row.categoryId === null
        ? none
        : (categoryIndex.map.get(row.categoryId) ?? none);
    categories[i] = category;
    members[i] =
      row.memberId === null ? -1 : (memberIndex.map.get(row.memberId) ?? -1);
    if (kinds[i] === 1) incomeByCategory[category] += amounts[i];
    else spendingByCategory[category] -= amounts[i];
  }
  tagOffsets[kept.length] = tagList.length;

  return {
    length: kept.length,
    days,
    amounts,
    kinds,
    categories,
    payees,
    members,
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
    firstDay: kept.length > 0 ? days[0] : null,
    lastDay: kept.length > 0 ? days[kept.length - 1] : null,
  };
}
