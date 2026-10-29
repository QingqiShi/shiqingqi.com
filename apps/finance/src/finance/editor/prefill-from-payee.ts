import type { RuleTemplate } from "../rules/rule-template-schema.ts";
import type {
  CategoryRow,
  EntryRow,
  PayeeRow,
  TransactionRow,
} from "../sync/row-schemas.ts";
import { splitEntries } from "./split-entries.ts";

export type PrefillField =
  "category" | "account" | "member" | "tags" | "paysDown";

interface PayeePrefill {
  categoryId: string | null;
  accountId: string | null;
  memberId: string | null;
  tagIds: readonly string[];
  /** The loan or card the last payment also paid down, and by how much (positive). */
  paysDown: { accountId: string; amountMinor: number } | null;
  /** The fields that came from the Payee's last Transaction, for the "from last time" mark. */
  fromLastTime: ReadonlySet<PrefillField>;
}

interface PayeePrefillInput {
  kind: "expense" | "income";
  payee: Pick<PayeeRow, "defaultCategoryId" | "defaultAccountId"> | undefined;
  /** The Payee's Transactions, newest first. */
  history: readonly TransactionRow[];
  entriesByTransaction: ReadonlyMap<string, readonly EntryRow[]>;
  tagIdsByTransaction: ReadonlyMap<string, readonly string[]>;
  categoryById: ReadonlyMap<string, Pick<CategoryRow, "kind" | "deletedAt">>;
  /** True for an account a new Transaction may use. */
  isUsableAccount: (accountId: string) => boolean;
  /** False for a Member the owner removed. */
  isActiveMember: (memberId: string) => boolean;
  /** The template of a Rule for this Payee, used when its history has no pays-down Entry. */
  ruleTemplate?: Pick<RuleTemplate, "kind" | "entries"> | null;
}

/**
 * What a Payee's last Transaction says about a new one: its Category (only
 * from a Transaction of the same kind), account, Member and Tags. The Payee's
 * own defaults fill a gap. The caller fills what is still null.
 */
export function prefillFromPayee(input: PayeePrefillInput): PayeePrefill {
  const fromLastTime = new Set<PrefillField>();
  const usable = input.history.filter(
    (row) => row.kind !== "transfer" && row.deletedAt === null,
  );
  const last =
    usable.find((row) => row.status === "posted") ?? usable.at(0) ?? null;
  const sameKind = usable.find((row) => row.kind === input.kind) ?? null;

  const isLiveCategory = (id: string | null): id is string => {
    if (id === null) return false;
    const category = input.categoryById.get(id);
    return category?.kind === input.kind && category.deletedAt === null;
  };

  let categoryId: string | null = null;
  if (sameKind && isLiveCategory(sameKind.categoryId)) {
    categoryId = sameKind.categoryId;
    fromLastTime.add("category");
  } else if (isLiveCategory(input.payee?.defaultCategoryId ?? null)) {
    categoryId = input.payee?.defaultCategoryId ?? null;
  }

  let accountId: string | null = null;
  const lastAccount = last
    ? input.entriesByTransaction.get(last.id)?.[0]?.accountId
    : undefined;
  if (lastAccount !== undefined && input.isUsableAccount(lastAccount)) {
    accountId = lastAccount;
    fromLastTime.add("account");
  } else {
    const fallback = input.payee?.defaultAccountId ?? null;
    if (fallback !== null && input.isUsableAccount(fallback)) {
      accountId = fallback;
    }
  }

  let memberId: string | null = null;
  if (last?.memberId && input.isActiveMember(last.memberId)) {
    memberId = last.memberId;
    fromLastTime.add("member");
  }

  const tagIds = last ? (input.tagIdsByTransaction.get(last.id) ?? []) : [];
  if (tagIds.length > 0) fromLastTime.add("tags");

  const paysDownOf = (
    entries: readonly Pick<EntryRow, "accountId" | "amountMinor">[],
  ) => {
    const second = splitEntries(entries).paysDown;
    return second && input.isUsableAccount(second.accountId)
      ? {
          accountId: second.accountId,
          amountMinor: Math.abs(second.amountMinor),
        }
      : null;
  };
  let paysDown = sameKind
    ? paysDownOf(input.entriesByTransaction.get(sameKind.id) ?? [])
    : null;
  if (paysDown) fromLastTime.add("paysDown");
  else if (input.ruleTemplate?.kind === input.kind) {
    paysDown = paysDownOf(input.ruleTemplate.entries);
  }

  return { categoryId, accountId, memberId, tagIds, paysDown, fromLastTime };
}
