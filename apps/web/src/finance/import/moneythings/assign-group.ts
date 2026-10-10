import type { accountKind } from "../../db/schema.ts";

export type AccountKind = (typeof accountKind.enumValues)[number];

export type GroupKey =
  | "liquid"
  | "investments"
  | "retirement"
  | "property"
  | "propertyDebt"
  | "studentLoans"
  | "credit"
  | "otherAssets"
  | "otherDebts";

interface GroupSeed {
  key: GroupKey;
  name: string;
  side: "asset" | "liability";
}

/**
 * The balance-sheet groups of the household's weekly sheet. A group holds one
 * side only, so the mortgage and the equity loan get their own liability
 * group, and the two fallbacks have different names.
 */
export const GROUP_SEEDS: readonly GroupSeed[] = [
  { key: "liquid", name: "流动资产", side: "asset" },
  { key: "investments", name: "投资", side: "asset" },
  { key: "retirement", name: "退休资产", side: "asset" },
  { key: "property", name: "不动产", side: "asset" },
  { key: "otherAssets", name: "其他资产", side: "asset" },
  { key: "propertyDebt", name: "不动产负债", side: "liability" },
  { key: "studentLoans", name: "学贷", side: "liability" },
  { key: "credit", name: "信用", side: "liability" },
  { key: "otherDebts", name: "其他负债", side: "liability" },
];

/** Generic words in an account name that say which group it belongs to. */
const BY_KEYWORD: readonly { pattern: RegExp; group: GroupKey }[] = [
  { pattern: /premium bond/i, group: "liquid" },
  { pattern: /退休金|养老|\bsipp\b|pension/i, group: "retirement" },
  { pattern: /房产|\bproperty\b|\bhouse\b/i, group: "property" },
  {
    pattern: /\bisa\b|\bgia\b|期权|\boptions?\b|crypto|\bstocks?\b/i,
    group: "investments",
  },
  { pattern: /student loan|学贷/i, group: "studentLoans" },
  { pattern: /房贷|mortgage|\bhtb\b|help to buy/i, group: "propertyDebt" },
];

const BY_KIND: Record<AccountKind, GroupKey> = {
  cash: "liquid",
  credit: "credit",
  investment: "investments",
  property: "property",
  receivable: "otherAssets",
  loan: "otherDebts",
};

/**
 * Groups chosen by MoneyThings account name, read from a file outside the
 * repository: `{ "<account name>": "<group key>" }`.
 */
export type GroupOverrides = Readonly<Record<string, GroupKey>>;

export function isGroupKey(value: unknown): value is GroupKey {
  return GROUP_SEEDS.some((seed) => seed.key === value);
}

function sideOf(kind: AccountKind) {
  return kind === "credit" || kind === "loan" ? "liability" : "asset";
}

/**
 * The group of an account: an override for its MoneyThings account name,
 * else a generic keyword in that name, else its kind. A group on the wrong
 * side for the kind is not used.
 */
export function assignGroup(
  sourceAccountName: string,
  kind: AccountKind,
  overrides: GroupOverrides = {},
): GroupKey {
  const name = sourceAccountName.trim();
  const candidates = [
    overrides[name],
    kind === "credit"
      ? undefined
      : BY_KEYWORD.find(({ pattern }) => pattern.test(name))?.group,
  ];
  for (const candidate of candidates) {
    const side = GROUP_SEEDS.find((seed) => seed.key === candidate)?.side;
    if (candidate && side === sideOf(kind)) return candidate;
  }
  return BY_KIND[kind];
}

/** MoneyThings has no property kind: an investment account in the property group is one. */
export function isPropertyAccount(
  sourceAccountName: string,
  overrides: GroupOverrides = {},
) {
  return assignGroup(sourceAccountName, "investment", overrides) === "property";
}
