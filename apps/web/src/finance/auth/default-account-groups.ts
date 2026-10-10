import type { SupportedLocale } from "#src/i18n/types.ts";

interface DefaultAccountGroup {
  side: "asset" | "liability";
  name: Record<SupportedLocale, string>;
}

const DEFAULT_ACCOUNT_GROUPS: readonly DefaultAccountGroup[] = [
  { side: "asset", name: { en: "Cash", zh: "流动资产" } },
  { side: "asset", name: { en: "Investments", zh: "投资" } },
  { side: "asset", name: { en: "Retirement", zh: "退休资产" } },
  { side: "asset", name: { en: "Property", zh: "不动产" } },
  { side: "liability", name: { en: "Credit cards", zh: "信用" } },
  { side: "liability", name: { en: "Loans", zh: "贷款" } },
];

/**
 * The Groups a Household gets at sign-up, named in `locale`, so that an
 * account of every Kind has a Group to go in. The Owner can rename or delete
 * them like any other Group.
 */
export function defaultAccountGroups(locale: SupportedLocale) {
  return DEFAULT_ACCOUNT_GROUPS.map(({ side, name }) => ({
    side,
    name: name[locale],
  }));
}
