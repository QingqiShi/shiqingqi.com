import { isValidDay } from "../domain/dates/to-epoch-day.ts";
import { isUuid } from "./is-uuid.ts";

export type TransactionKind = "expense" | "income" | "transfer";

/**
 * What the Transactions list shows. Every list field is "any of"; an empty
 * list does not filter.
 */
export interface TransactionFilters {
  accountIds: readonly string[];
  /** A Category also matches its descendants. */
  categoryIds: readonly string[];
  payeeIds: readonly string[];
  memberIds: readonly string[];
  tagIds: readonly string[];
  kinds: readonly TransactionKind[];
  /** Only Transactions that need Review. */
  review: boolean;
  /** Only Expected Transactions. */
  expected: boolean;
  /** First day, inclusive. */
  from: string | null;
  /** Last day, inclusive. */
  to: string | null;
  /** Search text, matched against the payee, note and Category name. */
  query: string;
}

/** The search param of each list field. A param repeats, or holds ids split by commas. */
const LIST_PARAMS = [
  ["accountIds", "account"],
  ["categoryIds", "category"],
  ["payeeIds", "payee"],
  ["memberIds", "member"],
  ["tagIds", "tag"],
] as const;

const KINDS: readonly TransactionKind[] = ["expense", "income", "transfer"];
const TRUE_VALUES = new Set(["1", "true", "yes"]);

export const EMPTY_TRANSACTION_FILTERS: TransactionFilters = {
  accountIds: [],
  categoryIds: [],
  payeeIds: [],
  memberIds: [],
  tagIds: [],
  kinds: [],
  review: false,
  expected: false,
  from: null,
  to: null,
  query: "",
};

interface ReadableParams {
  getAll: (name: string) => string[];
  get: (name: string) => string | null;
}

function listOf(params: ReadableParams, name: string) {
  const values = params
    .getAll(name)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value !== "");
  return [...new Set(values)];
}

function isKind(value: string): value is TransactionKind {
  return KINDS.some((kind) => kind === value);
}

function dayOf(params: ReadableParams, name: string) {
  const value = params.get(name)?.trim() ?? "";
  return isValidDay(value) ? value : null;
}

/**
 * The search-param contract of `/finance/transactions`, so other screens can
 * link to a filtered list: `account`, `category`, `payee`, `member`, `tag`
 * (ids; repeat the param or split by commas), `kind` (expense, income,
 * transfer), `review=1`, `expected=1`, `from` and `to` (YYYY-MM-DD,
 * inclusive) and `q` (search text). Values it cannot read are dropped.
 */
export const transactionFilters = {
  parse(params: ReadableParams): TransactionFilters {
    let from = dayOf(params, "from");
    let to = dayOf(params, "to");
    if (from !== null && to !== null && from > to) [from, to] = [to, from];
    const ids = (name: string) => listOf(params, name).filter(isUuid);
    return {
      accountIds: ids("account"),
      categoryIds: ids("category"),
      payeeIds: ids("payee"),
      memberIds: ids("member"),
      tagIds: ids("tag"),
      kinds: listOf(params, "kind").filter(isKind),
      review: TRUE_VALUES.has(params.get("review") ?? ""),
      expected: TRUE_VALUES.has(params.get("expected") ?? ""),
      from,
      to,
      query: (params.get("q") ?? "").trim().slice(0, 200),
    };
  },

  /** `params` with the filter params replaced by `filters`; other params stay. */
  write(params: URLSearchParams, filters: TransactionFilters): URLSearchParams {
    const next = new URLSearchParams(params);
    for (const [field, name] of LIST_PARAMS) {
      next.delete(name);
      const values = filters[field];
      if (values.length > 0) next.set(name, values.join(","));
    }
    next.delete("kind");
    if (filters.kinds.length > 0) next.set("kind", filters.kinds.join(","));
    for (const flag of ["review", "expected"] as const) {
      next.delete(flag);
      if (filters[flag]) next.set(flag, "1");
    }
    for (const day of ["from", "to"] as const) {
      next.delete(day);
      const value = filters[day];
      if (value !== null) next.set(day, value);
    }
    next.delete("q");
    if (filters.query !== "") next.set("q", filters.query);
    return next;
  },

  /** True when no filter and no search is on. */
  isEmpty(filters: TransactionFilters): boolean {
    return (
      LIST_PARAMS.every(([field]) => filters[field].length === 0) &&
      filters.kinds.length === 0 &&
      !filters.review &&
      !filters.expected &&
      filters.from === null &&
      filters.to === null &&
      filters.query === ""
    );
  },
};
