import type { RuleTemplate } from "../rules/rule-template-schema.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import { ruleTemplateMoney } from "./rule-template-money.ts";

export interface RuleTemplateEdit {
  /** The size of each occurrence in the base currency's minor units, above 0. */
  amountMinor: number;
  accountId: string;
  /** The account a transfer moves money to. */
  toAccountId: string;
  payeeId: string | null;
  categoryId: string | null;
}

interface EditContext {
  accountById: ReadonlyMap<string, AccountRow>;
  isBaseCurrency: (accountId: string) => boolean;
}

/**
 * The template of an existing Rule with a new amount, accounts, Payee and
 * Category; the kind, note and Tags stay. The caller checks that the
 * template has the simple shape (see `simpleTemplateAccounts`), and the new
 * one keeps it, so every account is in the base currency. The Member
 * follows the account when it was the old account's owner, as on a new Rule.
 */
export function editRuleTemplate(
  template: RuleTemplate,
  edit: RuleTemplateEdit,
  context: EditContext,
):
  | { ok: true; template: RuleTemplate }
  | {
      ok: false;
      error: "account" | "toAccount" | "sameAccount" | "category";
    } {
  const money = ruleTemplateMoney({ ...edit, kind: template.kind }, (id) =>
    context.isBaseCurrency(id) ? context.accountById.get(id) : undefined,
  );
  if (!money.ok) return money;
  const { account } = money;
  const previousAccountId = template.entries[0].accountId;
  const previousOwner =
    context.accountById.get(previousAccountId)?.ownerMemberId;
  const memberId =
    account.id !== previousAccountId && template.memberId === previousOwner
      ? account.ownerMemberId
      : template.memberId;
  return {
    ok: true,
    template: {
      ...template,
      entries: money.entries,
      payeeId: edit.payeeId,
      categoryId: money.categoryId,
      memberId,
    },
  };
}
