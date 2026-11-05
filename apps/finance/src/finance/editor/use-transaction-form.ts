import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { useSplitViewColumn } from "@tuja/ui/components/navigation-split-view";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { currencyExponent } from "../domain/money/currency-exponent.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import { applyAll } from "../replica/apply-with-undo.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import { useUndoToast } from "../shell/use-undo-toast.ts";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";
import { fillFromInterpretation } from "../transactions/fill-from-interpretation.ts";
import type { QuickAddInterpretation } from "../transactions/interpret-quick-add.ts";
import { isInReview } from "../transactions/is-in-review.ts";
import { shownAmount } from "../transactions/shown-amount.ts";
import type { TransactionKind } from "../transactions/transaction-filters.ts";
import { buildTransactionMutations } from "./build-transaction-mutations.ts";
import { draftOfNew } from "./draft-of-transaction.ts";
import type { EditorDraft, EditorError, EditorField } from "./editor-draft.ts";
import { findDuplicate } from "./find-duplicate.ts";
import type { FieldMarks } from "./marked-fields.ts";
import { ownerOfAccount } from "./owner-of-account.ts";
import type { EditorHost, EditorSeed } from "./transaction-editor.tsx";
import type { EditorData } from "./use-editor-data.ts";
import { useFieldLabels } from "./use-field-labels.ts";

interface TransactionFormOptions {
  data: EditorData;
  initialDraft: EditorDraft;
  transactionId: string | null;
  initialAccountId?: string | null;
  seed?: EditorSeed | null;
  interpretation?: QuickAddInterpretation | null;
  host: EditorHost;
}

const NO_ENTRIES: readonly EntryRow[] = [];

export function useTransactionForm({
  data,
  initialDraft,
  transactionId,
  initialAccountId,
  seed,
  interpretation,
  host,
}: TransactionFormOptions) {
  const [draft, setDraft] = useState(initialDraft);
  const locale = useLocale();
  const store = useReplicaStore();
  const undoable = useUndoToast();
  const presetTouched = (): ReadonlySet<string> =>
    new Set(
      transactionId === null &&
        initialAccountId != null &&
        draft.accountId === initialAccountId
        ? ["account"]
        : [],
    );
  const [touched, setTouched] = useState<ReadonlySet<string>>(
    () => new Set([...presetTouched(), ...(seed?.touched ?? [])]),
  );
  const [marks, setMarks] = useState<FieldMarks>(() => seed?.marks ?? {});
  const [appliedId, setAppliedId] = useState<number | null>(null);
  if (interpretation && interpretation.id !== appliedId) {
    setAppliedId(interpretation.id);
    const filled = fillFromInterpretation(
      data,
      draft,
      marks,
      touched,
      interpretation,
    );
    setDraft(filled.draft);
    setMarks(filled.marks);
  }
  const [errors, setErrors] = useState<
    Partial<Record<EditorField, EditorError>>
  >({});
  const [duplicate, setDuplicate] = useState<TransactionRow | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const column = useSplitViewColumn();
  // In a column or in its sheet, the Transaction is a place to read, not a
  // task: a headline names it and nothing takes focus on open.
  const isPlace = column !== null && transactionId !== null;
  const { focusRequest, focusTargetRef, close } = host;
  const newIdRef = useRef<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLButtonElement>(null);
  const toAccountRef = useRef<HTMLSelectElement>(null);
  const accountRef = useRef<HTMLSelectElement>(null);
  const paysDownRef = useRef<HTMLSelectElement>(null);
  const paysDownAmountRef = useRef<HTMLInputElement>(null);

  const existing =
    transactionId === null
      ? undefined
      : data.transactionsTable.get(transactionId);
  const isNew = transactionId === null;
  const existingEntries =
    (existing ? data.entriesByTransaction.get(existing.id) : undefined) ??
    NO_ENTRIES;
  const isExpected = existing?.status === "expected";
  const inReview =
    existing !== undefined &&
    isInReview(existing, existingEntries, data.lookups.accountById, data.today);
  const paidToday = isExpected && draft.date > data.today;

  useEffect(() => {
    if (focusRequest === null || (isPlace && focusRequest === undefined)) {
      return;
    }
    const target = focusRequest?.target ?? "amount";
    const element = {
      amount: amountRef.current,
      category: categoryRef.current,
      account: accountRef.current,
      toAccount: toAccountRef.current,
    }[target];
    if (focusTargetRef) focusTargetRef.current = element;
    // In a sheet, the card can still be below the screen. A focus that
    // scrolls would then move the page behind it.
    element?.focus({ preventScroll: !isPlace });
    if (target === "amount") amountRef.current?.select();
  }, [focusRequest, focusTargetRef, isNew, isPlace]);

  const account =
    draft.accountId === null
      ? undefined
      : data.lookups.accountById.get(draft.accountId);
  const currency = account?.currency ?? data.baseCurrency;
  const shownOf = (row: Pick<TransactionRow, "id" | "kind">) =>
    shownAmount(
      row,
      data.entriesByTransaction.get(row.id) ?? NO_ENTRIES,
      data.lookups.accountById,
      data.baseCurrency,
    );
  const shownMoney = (row: Pick<TransactionRow, "id" | "kind">) => {
    const shown = shownOf(row);
    return formatMoney(shown.amountMinor, shown.currency, locale);
  };
  const toAccount =
    draft.toAccountId === null
      ? undefined
      : data.lookups.accountById.get(draft.toAccountId);
  const needsToAmount =
    draft.kind === "transfer" &&
    toAccount !== undefined &&
    toAccount.currency !== currency;

  const messages: Record<EditorError, string> = {
    amountMissing: t({ en: "Enter an amount.", zh: "请输入金额。" }),
    amountUnreadable: t({
      en: "Enter an amount such as 12.50.",
      zh: "请输入金额，例如 12.50。",
    }),
    accountMissing: t({ en: "Choose an account.", zh: "请选择账户。" }),
    toAccountMissing: t({
      en: "Choose where the money goes.",
      zh: "请选择转入账户。",
    }),
    sameAccount: t({
      en: "Choose two different accounts.",
      zh: "请选择两个不同的账户。",
    }),
    categoryMissing: t({ en: "Choose a category.", zh: "请选择分类。" }),
  };
  const errorOf = (field: EditorField) => {
    const error = errors[field];
    return error ? messages[error] : undefined;
  };
  const toastSaved = t({ en: "Saved", zh: "已保存" });
  const toastAdded = t({ en: "Added", zh: "已记录" });
  const toastConfirmed = t({ en: "Confirmed", zh: "已确认" });
  const toastDeleted = t({ en: "Deleted", zh: "已删除" });
  const toastSkipped = t({ en: "Skipped", zh: "已跳过" });
  const saveFailed = t({
    en: "This could not be saved. Check the fields and try again.",
    zh: "未能保存，请检查各项后重试。",
  });

  const update = (fields: Partial<EditorDraft>, mark: string[] = []) => {
    setDraft({ ...draft, ...fields });
    if (mark.length > 0) {
      setTouched(new Set([...touched, ...mark]));
      setMarks(
        Object.fromEntries(
          Object.entries(marks).filter(([field]) => !mark.includes(field)),
        ),
      );
    }
    if (Object.keys(errors).length > 0) setErrors({});
    if (duplicate) setDuplicate(null);
    setFailure(null);
  };

  const isUsableAccount = (accountId: string) =>
    data.openAccounts.some((candidate) => candidate.id === accountId);

  const isActiveMember = (memberId: string) =>
    data.members.some((member) => member.id === memberId);

  const ownerOf = (accountId: string | null) => ownerOfAccount(data, accountId);

  const convertedToAmount = (amountText: string, toId: string | null) => {
    const target =
      toId === null ? undefined : data.lookups.accountById.get(toId);
    const minor = parseMoney(amountText, currency);
    if (!target || minor === null || target.currency === currency) return "";
    const day = toEpochDay(draft.date);
    const inBase = data.fx.toBase(Math.abs(minor), currency, day);
    const rate = data.fx.rateToBase(target.currency, day);
    const exponentGap =
      10 **
      (currencyExponent(target.currency) - currencyExponent(data.baseCurrency));
    return minorUnitsToDecimalString(
      Math.round((inBase / rate) * exponentGap),
      target.currency,
    );
  };

  const save = (andNew: boolean) => {
    if (newIdRef.current === null) newIdRef.current = crypto.randomUUID();
    const result = buildTransactionMutations(
      paidToday ? { ...draft, date: data.today } : draft,
      {
        target: existing
          ? {
              type: "update",
              existing,
              entries: data.entriesByTransaction.get(existing.id) ?? [],
              tagIds: data.tagIdsByTransaction.get(existing.id) ?? [],
            }
          : { type: "create", id: newIdRef.current },
        accountById: data.lookups.accountById,
        payees: data.payees,
        baseCurrency: data.baseCurrency,
        createId: () => crypto.randomUUID(),
      },
    );
    if (!result.ok) {
      setErrors(result.errors);
      if (result.errors.amount) amountRef.current?.focus();
      else if (result.errors.category) categoryRef.current?.focus();
      else if (result.errors.account) accountRef.current?.focus();
      else if (result.errors.toAccount) toAccountRef.current?.focus();
      else if (result.errors.paysDown) paysDownRef.current?.focus();
      else if (result.errors.paysDownAmount) {
        paysDownAmountRef.current?.focus();
      }
      return;
    }
    if (isNew && !duplicate) {
      const created = result.mutations.find(
        (mutation) => mutation.name === "createTransaction",
      );
      const match =
        created?.name === "createTransaction"
          ? findDuplicate(
              {
                id: null,
                date: created.args.date,
                entries: created.args.entries,
              },
              data.byAccount,
              data.entriesByTransaction,
            )
          : null;
      if (match) {
        setDuplicate(match);
        return;
      }
    }
    const offerTeach = existing ? host.watchCorrection(existing.id) : undefined;
    try {
      applyAll(store, result.mutations);
    } catch {
      setFailure(saveFailed);
      return;
    }
    undoable(
      isNew ? toastAdded : isExpected ? toastConfirmed : toastSaved,
      result.undo,
      offerTeach?.(),
    );
    newIdRef.current = null;
    if (andNew && isNew) {
      setDraft({
        ...draftOfNew(data, draft.kind),
        date: draft.date,
        accountId: draft.accountId,
        memberId: draft.memberId,
      });
      setTouched(presetTouched());
      setMarks({});
      setDuplicate(null);
      amountRef.current?.focus();
    }
    host.afterSave(result.transactionId, andNew);
  };

  const remove = () => {
    if (!existing) return;
    if (isExpected) {
      store.applyLocal({ name: "skipExpected", args: { id: existing.id } });
      undoable(toastSkipped, [
        { name: "restoreTransaction", args: { id: existing.id } },
      ]);
    } else {
      store.applyLocal({
        name: "deleteTransaction",
        args: { id: existing.id },
      });
      undoable(toastDeleted, [
        { name: "restoreTransaction", args: { id: existing.id } },
      ]);
    }
    close();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      save(true);
    } else if (
      event.key === "Escape" &&
      column !== null &&
      !event.defaultPrevented
    ) {
      event.preventDefault();
      close();
    }
  };

  const headings: Record<TransactionKind, string> = {
    expense: t({ en: "New expense", zh: "记一笔支出" }),
    income: t({ en: "New income", zh: "记一笔收入" }),
    transfer: t({ en: "New transfer", zh: "记一笔转账" }),
  };
  const heading = isNew
    ? draft.refund
      ? t({ en: "New refund", zh: "记一笔退款" })
      : headings[draft.kind]
    : isExpected
      ? t({ en: "Expected transaction", zh: "待确认交易" })
      : inReview
        ? t({ en: "Review transaction", zh: "审核交易" })
        : t({ en: "Transaction", zh: "交易" });
  const { categoryName, kindNames, labelMark } = useFieldLabels({
    data,
    draft,
    marks,
    showMissing: Boolean(interpretation || seed?.marks),
  });

  return {
    data,
    host,
    transactionId,
    locale,
    store,
    undoable,
    draft,
    touched,
    setMarks,
    marks,
    duplicate,
    failure,
    setFailure,
    saveFailed,
    column,
    isPlace,
    amountRef,
    categoryRef,
    toAccountRef,
    accountRef,
    paysDownRef,
    paysDownAmountRef,
    existing,
    isNew,
    existingEntries,
    isExpected,
    inReview,
    paidToday,
    account,
    currency,
    shownOf,
    shownMoney,
    toAccount,
    needsToAmount,
    errorOf,
    categoryName,
    update,
    isUsableAccount,
    isActiveMember,
    ownerOf,
    convertedToAmount,
    save,
    remove,
    handleKeyDown,
    heading,
    kindNames,
    labelMark,
  };
}

export type TransactionForm = ReturnType<typeof useTransactionForm>;
