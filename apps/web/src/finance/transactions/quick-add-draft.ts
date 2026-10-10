import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import { draftOfNew } from "../editor/draft-of-transaction.ts";
import type { EditorDraft } from "../editor/editor-draft.ts";
import { prefillFromPayee } from "../editor/prefill-from-payee.ts";
import { normalisePayeeText, rankPayees } from "../editor/rank-payees.ts";
import type { EditorData } from "../editor/use-editor-data.ts";
import type { QuickAdd } from "./parse-quick-add.ts";

interface QuickAddDraft {
  draft: EditorDraft;
  /** The Payee the text names, when one does. */
  payeeName: string | null;
  /** True when every field has a value, so Enter saves without the form. */
  complete: boolean;
}

/** The account whose name, institution or label best fits `text`. */
function matchAccount(data: EditorData, text: string) {
  const wanted = normalisePayeeText(text);
  if (wanted === "") return null;
  const scored = data.openAccounts.flatMap((account) => {
    const label = normalisePayeeText(
      data.lookups.accountLabelById.get(account.id) ?? account.name,
    );
    const name = normalisePayeeText(account.name);
    if (name === wanted || label === wanted) return [{ account, score: 0 }];
    if (name.startsWith(wanted) || label.startsWith(wanted)) {
      return [{ account, score: 1 }];
    }
    if (label.includes(wanted)) return [{ account, score: 2 }];
    return [];
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.at(0)?.account.id ?? null;
}

/**
 * The live Category a quick-add text names: its name, or its emoji and name,
 * or its emoji alone. Without a sign, an expense Category comes first and an
 * income one makes the line an income.
 */
function matchCategory(data: EditorData, text: string, parsed: QuickAdd) {
  const wanted = normalisePayeeText(text);
  if (wanted === "") return undefined;
  const kinds: ("expense" | "income")[] = parsed.kindIsExplicit
    ? parsed.kind === "transfer"
      ? []
      : [parsed.kind]
    : ["expense", "income"];
  for (const kind of kinds) {
    const found = data.categories.find((category) => {
      if (category.kind !== kind) return false;
      const name = normalisePayeeText(category.name);
      const emoji = normalisePayeeText(category.emoji);
      return (
        name === wanted ||
        (emoji !== "" &&
          (wanted === emoji ||
            wanted === normalisePayeeText(`${emoji} ${name}`)))
      );
    });
    if (found) return { id: found.id, kind };
  }
  return undefined;
}

/** The account of the newest Transaction in this Category, when it is still open. */
function lastAccountOfCategory(data: EditorData, categoryId: string) {
  const last = data.transactions.find(
    (row) => row.categoryId === categoryId && row.status === "posted",
  );
  const accountId = last
    ? data.entriesByTransaction.get(last.id)?.[0]?.accountId
    : undefined;
  return accountId !== undefined &&
    data.openAccounts.some((account) => account.id === accountId)
    ? accountId
    : null;
}

/**
 * The editor draft a quick-add line describes: the Payee it names (an exact
 * name first, then a Category by name, else the best Payee prefix match),
 * and everything else from that Payee's last Transaction, today and the
 * signed-in Member. A word after an amount in the middle names the account.
 */
export function quickAddDraft(
  data: EditorData,
  parsed: QuickAdd,
): QuickAddDraft {
  const base = draftOfNew(data, parsed.kind);
  const currency =
    (base.accountId === null
      ? undefined
      : data.lookups.accountById.get(base.accountId)?.currency) ??
    data.baseCurrency;
  const amountText =
    parsed.amountMinor === null
      ? ""
      : minorUnitsToDecimalString(parsed.amountMinor, currency);

  if (parsed.kind === "transfer") {
    const accountId =
      parsed.text === "" ? base.accountId : matchAccount(data, parsed.text);
    const toAccountId = matchAccount(data, parsed.toText);
    return {
      draft: { ...base, amountText, accountId, toAccountId },
      payeeName: null,
      complete:
        amountText !== "" &&
        accountId !== null &&
        toAccountId !== null &&
        accountId !== toAccountId &&
        data.lookups.accountById.get(accountId)?.currency ===
          data.lookups.accountById.get(toAccountId)?.currency,
    };
  }

  const text = parsed.text.trim();
  const wanted = normalisePayeeText(text);
  const hintedAccountId =
    parsed.accountText === "" ? null : matchAccount(data, parsed.accountText);
  const accountHintFailed =
    parsed.accountText !== "" && hintedAccountId === null;
  const exactPayee =
    wanted === ""
      ? undefined
      : data.payees.find((payee) => normalisePayeeText(payee.name) === wanted);
  const category = exactPayee ? undefined : matchCategory(data, text, parsed);

  if (category) {
    const draft: EditorDraft = {
      ...base,
      kind: category.kind,
      amountText,
      categoryId: category.id,
      accountId:
        hintedAccountId ??
        lastAccountOfCategory(data, category.id) ??
        base.accountId,
    };
    return {
      draft,
      payeeName: null,
      complete:
        amountText !== "" && draft.accountId !== null && !accountHintFailed,
    };
  }

  const best =
    exactPayee ??
    (wanted === ""
      ? undefined
      : rankPayees(text, data.payees, {
          lastUsedById: data.lastUsedByPayee,
          limit: 1,
        }).find((payee) => normalisePayeeText(payee.name).startsWith(wanted)));

  const draft: EditorDraft = { ...base, amountText, payeeName: text };
  if (best) {
    const prefill = prefillFromPayee({
      kind: parsed.kind,
      payee: best,
      history: data.byPayee.get(best.id) ?? [],
      entriesByTransaction: data.entriesByTransaction,
      tagIdsByTransaction: data.tagIdsByTransaction,
      categoryById: data.lookups.categoryById,
      isUsableAccount: (id) =>
        data.openAccounts.some((account) => account.id === id),
      isActiveMember: (id) => data.members.some((member) => member.id === id),
      ruleTemplate: data.rules.find((rule) => rule.template.payeeId === best.id)
        ?.template,
    });
    draft.payeeId = best.id;
    draft.payeeName = best.name;
    draft.categoryId = prefill.categoryId;
    draft.accountId = prefill.accountId ?? draft.accountId;
    draft.memberId = prefill.memberId ?? draft.memberId;
    draft.tagIds = prefill.tagIds;
    if (prefill.paysDown) {
      const loanCurrency =
        data.lookups.accountById.get(prefill.paysDown.accountId)?.currency ??
        data.baseCurrency;
      draft.paysDownAccountId = prefill.paysDown.accountId;
      draft.paysDownAmountText = minorUnitsToDecimalString(
        prefill.paysDown.amountMinor,
        loanCurrency,
      );
    }
  }
  if (hintedAccountId !== null) draft.accountId = hintedAccountId;
  if (draft.paysDownAccountId === draft.accountId) {
    draft.paysDownAccountId = null;
    draft.paysDownAmountText = "";
  }
  return {
    draft,
    payeeName: best?.name ?? (text === "" ? null : text),
    complete:
      amountText !== "" &&
      draft.categoryId !== null &&
      draft.accountId !== null &&
      !accountHintFailed,
  };
}
