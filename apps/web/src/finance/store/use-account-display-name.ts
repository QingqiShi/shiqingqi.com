import { t } from "#src/i18n.ts";
import type { AccountRow } from "../sync/row-schemas.ts";

/** The words a screen shows for the system accounts, from `t()` in render. */
export interface SystemAccountNames {
  inTransit: string;
}

/** The translated system account names, for code outside render that names accounts. */
export function useSystemAccountNames(): SystemAccountNames {
  return { inTransit: t({ en: "In transit", zh: "在途" }) };
}

/**
 * Names an account for display. In transit keeps an English name in the
 * database, so it shows in the visitor's language.
 */
export function useAccountDisplayName() {
  const names = useSystemAccountNames();
  return (account: Pick<AccountRow, "name" | "isSystem">) =>
    account.isSystem ? names.inTransit : account.name;
}
