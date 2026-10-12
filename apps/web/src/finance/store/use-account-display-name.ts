import { t } from "#src/i18n.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import {
  accountDisplayName,
  type SystemAccountNames,
} from "./account-display-name.ts";

/** The translated system account names, for code outside render that calls `accountDisplayName`. */
// eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- the i18n transform adds a useI18nTranslations hook call to each function that calls t(), so the prefix is earned; the rule only sees the pre-transform source
export function useSystemAccountNames(): SystemAccountNames {
  return { inTransit: t({ en: "In transit", zh: "在途" }) };
}

/** Names an account for display; In transit shows in the visitor's language. */
export function useAccountDisplayName() {
  const names = useSystemAccountNames();
  return (account: Pick<AccountRow, "name" | "isSystem">) =>
    accountDisplayName(account, names);
}
