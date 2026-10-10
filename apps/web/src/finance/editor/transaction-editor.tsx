"use client";

import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowUUpLeft";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { RepeatIcon } from "@phosphor-icons/react/dist/ssr/Repeat";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Chip } from "@tuja/ui/components/chip";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Select } from "@tuja/ui/components/select";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { currencySymbol } from "../accounts/currency-symbol.ts";
import { suggestLabelsFromMemory } from "../ai/suggest-labels-from-memory.ts";
import type { LabelMemory, Suggestion } from "../ai/types.ts";
import { bankApiClient } from "../bank/bank-api-client.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { currencyExponent } from "../domain/money/currency-exponent.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import { useToast } from "../shell/toast-provider.tsx";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";
import { ConfidenceBadge } from "../transactions/confidence-badge.tsx";
import { detectRecurring } from "../transactions/detect-recurring.ts";
import { ruleFromTransaction } from "../transactions/rule-from-transaction.ts";
import type { TransactionKind } from "../transactions/transaction-filters.ts";
import { canPayInInstalments } from "./build-instalment-plan.ts";
import { buildTransactionMutations } from "./build-transaction-mutations.ts";
import { CategoryPicker } from "./category-picker.tsx";
import { Combobox, type ComboboxOption } from "./combobox.tsx";
import { DateChips } from "./date-chips.tsx";
import {
  draftOfNew,
  draftOfRefund,
  draftOfTransaction,
  usualTransferSource,
} from "./draft-of-transaction.ts";
import type { EditorDraft, EditorError, EditorField } from "./editor-draft.ts";
import { FieldLabel } from "./field-label.tsx";
import { findDuplicate, latestValuationFrom } from "./find-duplicate.ts";
import { InstalmentPanel } from "./instalment-panel.tsx";
import { prefillFromPayee, type PrefillField } from "./prefill-from-payee.ts";
import { rankPayees } from "./rank-payees.ts";
import { ruleDeclines } from "./rule-declines.ts";
import { TagPicker } from "./tag-picker.tsx";
import { topCategories } from "./top-categories.ts";
import { useEditorData, type EditorData } from "./use-editor-data.ts";
import { useKeyboardInset } from "./use-keyboard-inset.ts";

export type EditorFocusTarget = "amount" | "category" | "heading";

interface TransactionEditorProps {
  /** The Transaction to edit, or null for a new one. */
  transactionId: string | null;
  /** The kind of a new Transaction. */
  initialKind?: TransactionKind;
  /** A new refund of this Transaction. */
  refundOfId?: string | null;
  /** The fields of a new Transaction filled in already, such as from quick add. */
  seedDraft?: EditorDraft | null;
  /** Where focus goes when the editor opens; `nonce` lets the list ask again. */
  focusRequest?: { target: EditorFocusTarget; nonce: number };
  /** Receives the element that takes focus, for a sheet that moves focus after it opens. */
  focusTargetRef?: RefObject<HTMLElement | null>;
  /** Shows a close button; the sheet below `lg` has its own. */
  showClose?: boolean;
  onClose: () => void;
  /** After a save. `andNew` asks for a blank editor again. */
  onSaved?: (transactionId: string, andNew: boolean) => void;
  onOpenTransaction: (transactionId: string) => void;
  onRefund?: (transactionId: string) => void;
}

const NO_ENTRIES: readonly EntryRow[] = [];
/**
 * The end padding of the pane and the sheet that hold the editor. The
 * sticky footer moves down into it, because a sticky box stops at the
 * scroller's padding edge.
 */
const PANE_END_PADDING = `${space._7} + env(safe-area-inset-bottom)`;
const PAYS_DOWN_KINDS: ReadonlySet<string> = new Set([
  "loan",
  "credit",
  "receivable",
]);

function initialDraft(
  data: EditorData,
  transactionId: string | null,
  kind: TransactionKind,
  refundOfId: string | null,
  seedDraft: EditorDraft | null,
) {
  if (transactionId !== null) return draftOfTransaction(data, transactionId);
  if (seedDraft) return seedDraft;
  if (refundOfId) {
    const refund = draftOfRefund(data, refundOfId);
    if (refund) return refund;
  }
  return draftOfNew(data, kind);
}

function labelMemoryOf(data: EditorData): LabelMemory {
  return {
    baseCurrency: data.baseCurrency,
    aliases: [],
    payees: data.payees.map((payee) => ({
      id: payee.id,
      name: payee.name,
      defaultCategoryId: payee.defaultCategoryId,
    })),
    categories: data.categories.map((category) => ({
      id: category.id,
      parentId: category.parentId,
      kind: category.kind,
      name: category.name,
    })),
    tags: data.tags.map((tag) => ({ id: tag.id, name: tag.name })),
    members: data.members.map((member) => ({
      id: member.id,
      name: member.name,
    })),
    accounts: data.openAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      kind: account.kind,
      currency: account.currency,
      ownerMemberId: account.ownerMemberId,
    })),
    transactions: data.transactions
      .filter((row) => row.status === "posted" && row.payeeId !== null)
      .slice(0, 2000)
      .map((row) => ({
        id: row.id,
        date: row.date,
        kind: row.kind,
        amountMinor: row.amountMinor,
        payeeId: row.payeeId,
        categoryId: row.categoryId,
        memberId: row.memberId,
        tagIds: data.tagIdsByTransaction.get(row.id) ?? [],
        accountIds: (data.entriesByTransaction.get(row.id) ?? []).map(
          (entry) => entry.accountId,
        ),
      })),
  };
}

/**
 * The Transaction form (design §9.2): every field has a default, so Enter
 * saves at any point; ⌘/Ctrl+Enter saves and starts a new one. Picking a
 * Payee fills in what its last Transaction had. An existing Transaction
 * saves as a patch of the changed fields, an Expected one confirms, one in
 * Review clears its flag.
 */
export function TransactionEditor(props: TransactionEditorProps) {
  const data = useEditorData();
  const [draft, setDraft] = useState<EditorDraft | null>(() =>
    initialDraft(
      data,
      props.transactionId,
      props.initialKind ?? "expense",
      props.refundOfId ?? null,
      props.seedDraft ?? null,
    ),
  );
  const deleted =
    props.transactionId !== null &&
    data.transactionsTable.get(props.transactionId)?.deletedAt != null;
  if (!draft || deleted) {
    return (
      <div css={stack.item}>
        <p css={[typeRole.body, styles.muted]}>
          {deleted
            ? t({
                en: "This transaction was deleted.",
                zh: "这笔交易已删除。",
              })
            : t({
                en: "This transaction can't be found.",
                zh: "找不到这笔交易。",
              })}
        </p>
        <div>
          <Button onClick={props.onClose}>
            {t({ en: "Close", zh: "关闭" })}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <EditorForm
      {...props}
      data={data}
      draft={draft}
      setDraft={(next) => {
        setDraft(next);
      }}
    />
  );
}

interface EditorFormProps extends TransactionEditorProps {
  data: EditorData;
  draft: EditorDraft;
  setDraft: (draft: EditorDraft) => void;
}

function EditorForm({
  data,
  draft,
  setDraft,
  transactionId,
  focusRequest,
  focusTargetRef,
  showClose,
  onClose,
  onSaved,
  onOpenTransaction,
  onRefund,
}: EditorFormProps) {
  const locale = useLocale();
  const store = useReplicaStore();
  const showToast = useToast();
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [fromLast, setFromLast] = useState<ReadonlySet<PrefillField>>(
    () => new Set(),
  );
  const [errors, setErrors] = useState<
    Partial<Record<EditorField, EditorError>>
  >({});
  const [duplicate, setDuplicate] = useState<TransactionRow | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [suggestState, setSuggestState] = useState<
    "idle" | "busy" | "none" | "failed"
  >("idle");
  const [ruleOffer, setRuleOffer] = useState<"open" | "declined">("open");
  const [instalmentsOpen, setInstalmentsOpen] = useState(false);
  const keyboardInset = useKeyboardInset();
  const newIdRef = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
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
  const inReview = existing?.needsReview === true;
  const paidToday = isExpected && draft.date > data.today;

  useEffect(() => {
    const target = focusRequest?.target ?? "amount";
    const element =
      target === "amount"
        ? amountRef.current
        : target === "category"
          ? categoryRef.current
          : headingRef.current;
    if (focusTargetRef) focusTargetRef.current = element;
    element?.focus();
    if (target === "amount") amountRef.current?.select();
  }, [focusRequest, focusTargetRef, isNew]);

  const account =
    draft.accountId === null
      ? undefined
      : data.lookups.accountById.get(draft.accountId);
  const currency = account?.currency ?? data.baseCurrency;
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
  const toastRule = t({ en: "Rule added", zh: "已添加周期规则" });
  const undoLabel = t({ en: "Undo", zh: "撤销" });
  const saveFailed = t({
    en: "This could not be saved. Check the fields and try again.",
    zh: "未能保存，请检查各项后重试。",
  });
  const newPayeeLabel = t({ en: "New payee", zh: "新商家" });
  const categoryName = useCategoryDisplayName();

  const update = (fields: Partial<EditorDraft>, mark: string[] = []) => {
    setDraft({ ...draft, ...fields });
    if (mark.length > 0) setTouched(new Set([...touched, ...mark]));
    if (Object.keys(errors).length > 0) setErrors({});
    if (duplicate) setDuplicate(null);
    setFailure(null);
  };

  const isUsableAccount = (accountId: string) =>
    data.openAccounts.some((candidate) => candidate.id === accountId);

  const isActiveMember = (memberId: string) =>
    data.members.some((member) => member.id === memberId);

  const ownerOf = (accountId: string | null) => {
    const owner =
      accountId === null
        ? null
        : (data.lookups.accountById.get(accountId)?.ownerMemberId ?? null);
    return owner !== null && isActiveMember(owner) ? owner : null;
  };

  const removedMember =
    draft.memberId === null || isActiveMember(draft.memberId)
      ? undefined
      : data.lookups.memberById.get(draft.memberId);
  const memberChoices = removedMember
    ? [...data.members, removedMember]
    : data.members;

  const choosePayee = (payeeId: string, name: string) => {
    const next: Partial<EditorDraft> = { payeeId, payeeName: name };
    if (draft.kind === "transfer") {
      update(next, ["payee"]);
      return;
    }
    const prefill = prefillFromPayee({
      kind: draft.kind,
      payee: data.lookups.payeeById.get(payeeId),
      history: data.byPayee.get(payeeId) ?? [],
      entriesByTransaction: data.entriesByTransaction,
      tagIdsByTransaction: data.tagIdsByTransaction,
      categoryById: data.lookups.categoryById,
      isUsableAccount,
      isActiveMember,
      ruleTemplate: data.rules.find((rule) => rule.template.payeeId === payeeId)
        ?.template,
    });
    const applied = new Set<PrefillField>();
    if (prefill.categoryId !== null && !touched.has("category")) {
      next.categoryId = prefill.categoryId;
      if (prefill.fromLastTime.has("category")) applied.add("category");
    }
    if (prefill.accountId !== null && !touched.has("account")) {
      next.accountId = prefill.accountId;
      if (prefill.fromLastTime.has("account")) applied.add("account");
    }
    if (!touched.has("member")) {
      const memberId =
        prefill.memberId ?? ownerOf(next.accountId ?? draft.accountId);
      if (memberId !== null) next.memberId = memberId;
      if (prefill.fromLastTime.has("member")) applied.add("member");
    }
    if (!touched.has("tags") && prefill.tagIds.length > 0) {
      next.tagIds = prefill.tagIds;
      applied.add("tags");
    }
    if (
      !touched.has("paysDown") &&
      prefill.paysDown &&
      draft.kind === "expense" &&
      !draft.refund &&
      prefill.paysDown.accountId !== (next.accountId ?? draft.accountId)
    ) {
      next.paysDownAccountId = prefill.paysDown.accountId;
      next.paysDownAmountText = minorUnitsToDecimalString(
        prefill.paysDown.amountMinor,
        data.lookups.accountById.get(prefill.paysDown.accountId)?.currency ??
          data.baseCurrency,
      );
      if (prefill.fromLastTime.has("paysDown")) applied.add("paysDown");
    }
    setFromLast(applied);
    update(next, ["payee"]);
  };

  const payeeOptions: ComboboxOption[] = rankPayees(
    draft.payeeName,
    data.payees,
    { lastUsedById: data.lastUsedByPayee },
  ).map((payee) => {
    const last = data.byPayee.get(payee.id)?.at(0);
    const category =
      last?.categoryId == null
        ? undefined
        : data.lookups.categoryById.get(last.categoryId);
    return {
      id: payee.id,
      label: payee.name,
      leading: category
        ? data.lookups.categoryEmojiById.get(category.id) || undefined
        : undefined,
      detail: category ? categoryName(category) : undefined,
    };
  });

  const kindCategories =
    draft.kind === "transfer"
      ? []
      : data.categories.filter((category) => category.kind === draft.kind);
  const topIds =
    draft.kind === "transfer"
      ? []
      : topCategories({
          kind: draft.kind,
          payeeHistory:
            draft.payeeId === null
              ? []
              : (data.byPayee.get(draft.payeeId) ?? []),
          recent: data.transactions,
          categories: kindCategories,
        });

  const accountChoices = data.accounts.filter(
    (candidate) =>
      candidate.closedOn === null ||
      candidate.id === draft.accountId ||
      candidate.id === draft.toAccountId,
  );
  const accountOptions = data.accountGroups
    .map((group) => ({
      group,
      accounts: accountChoices.filter(
        (candidate) => candidate.groupId === group.id,
      ),
    }))
    .filter((entry) => entry.accounts.length > 0);
  const accountSelectChildrenWhere = (
    keep: (candidate: (typeof accountChoices)[number]) => boolean,
  ) =>
    accountOptions
      .map(({ group, accounts }) => ({
        group,
        accounts: accounts.filter(keep),
      }))
      .filter(({ accounts }) => accounts.length > 0)
      .map(({ group, accounts }) => (
        <optgroup key={group.id} label={group.name}>
          {accounts.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {data.lookups.accountLabelById.get(candidate.id) ??
                candidate.name}
            </option>
          ))}
        </optgroup>
      ));
  const accountSelectChildren = accountSelectChildrenWhere(() => true);
  const toAccountSelectChildren = accountSelectChildrenWhere(
    (candidate) =>
      candidate.id !== draft.accountId || candidate.id === draft.toAccountId,
  );
  const paysDownSelectChildren = accountSelectChildrenWhere(
    (candidate) =>
      (PAYS_DOWN_KINDS.has(candidate.kind) &&
        candidate.id !== draft.accountId) ||
      candidate.id === draft.paysDownAccountId,
  );
  const paysDownAccount =
    draft.paysDownAccountId === null
      ? undefined
      : data.lookups.accountById.get(draft.paysDownAccountId);
  const canPayDown =
    draft.kind === "expense" &&
    !draft.refund &&
    data.accounts.some(
      (candidate) =>
        PAYS_DOWN_KINDS.has(candidate.kind) && candidate.closedOn === null,
    );

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

  const payeeHistory =
    draft.payeeId === null ? [] : (data.byPayee.get(draft.payeeId) ?? []);
  const refundCandidates = payeeHistory
    .filter(
      (row) =>
        row.kind === "expense" &&
        row.amountMinor < 0 &&
        row.status === "posted" &&
        row.id !== transactionId,
    )
    .slice(0, 10);

  const valuation = latestValuationFrom(
    data.valuations,
    [
      draft.accountId,
      draft.kind === "transfer" ? draft.toAccountId : null,
    ].filter((id): id is string => id !== null),
    draft.date,
  );

  const pattern =
    existing && existing.status === "posted" && existing.payeeId !== null
      ? detectRecurring(existing, data.byPayee.get(existing.payeeId) ?? [])
      : null;
  const payeeHasRule =
    existing?.payeeId != null &&
    data.rules.some((rule) => rule.template.payeeId === existing.payeeId);
  const showRuleOffer =
    pattern !== null &&
    !payeeHasRule &&
    existing?.ruleId === null &&
    ruleOffer === "open" &&
    existing.payeeId !== null &&
    !ruleDeclines.has(existing.payeeId);

  const cadenceLabels = {
    week: t({ en: "every week", zh: "每周" }),
    month: t({ en: "every month", zh: "每月" }),
    year: t({ en: "every year", zh: "每年" }),
  };

  const apply = (mutations: readonly LocalMutationInput[]) => {
    for (const mutation of mutations) store.applyLocal(mutation);
  };

  const undoable = (message: string, undo: readonly LocalMutationInput[]) => {
    showToast({
      message,
      action:
        undo.length === 0
          ? undefined
          : {
              label: undoLabel,
              onAction: () => {
                try {
                  apply(undo);
                } catch {
                  // The row changed again since; Undo has nothing left to do.
                }
              },
            },
    });
  };

  const save = (andNew: boolean) => {
    newIdRef.current ??= crypto.randomUUID();
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
        fx: data.fx,
        createId: () => crypto.randomUUID(),
      },
    );
    if (!result.ok) {
      setErrors(result.errors);
      if (result.errors.amount) amountRef.current?.focus();
      else if (result.errors.account) accountRef.current?.focus();
      else if (result.errors.toAccount) toAccountRef.current?.focus();
      else if (result.errors.category) categoryRef.current?.focus();
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
    try {
      apply(result.mutations);
    } catch {
      setFailure(saveFailed);
      return;
    }
    undoable(
      isNew ? toastAdded : isExpected ? toastConfirmed : toastSaved,
      result.undo,
    );
    newIdRef.current = null;
    if (andNew) {
      setDraft({
        ...draftOfNew(data, draft.kind),
        date: draft.date,
        accountId: draft.accountId,
        memberId: draft.memberId,
      });
      setTouched(new Set());
      setFromLast(new Set());
      setDuplicate(null);
      amountRef.current?.focus();
    }
    onSaved?.(result.transactionId, andNew);
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
    onClose();
  };

  const makeRule = () => {
    if (!existing) return;
    const payee =
      existing.payeeId === null
        ? undefined
        : data.lookups.payeeById.get(existing.payeeId);
    const category =
      existing.categoryId === null
        ? undefined
        : data.lookups.categoryById.get(existing.categoryId);
    const ruleId = crypto.randomUUID();
    const args = ruleFromTransaction({
      ruleId,
      name: payee?.name ?? category?.name ?? existing.note.slice(0, 60),
      transaction: existing,
      entries: data.entriesByTransaction.get(existing.id) ?? [],
      tagIds: data.tagIdsByTransaction.get(existing.id) ?? [],
      pattern,
      today: data.today,
    });
    try {
      store.applyLocal({ name: "upsertRule", args });
    } catch {
      setFailure(saveFailed);
      return;
    }
    setRuleOffer("declined");
    undoable(
      `${toastRule} · ${cadenceLabels[args.unit ?? "month"]} · ${displayDay(args.startsOn ?? data.today, locale, "weekday")}`,
      [{ name: "upsertRule", args: { id: ruleId, deleted: true } }],
    );
  };

  const applySuggestion = (suggestion: Suggestion) => {
    const payee =
      suggestion.payeeId === undefined
        ? undefined
        : data.lookups.payeeById.get(suggestion.payeeId);
    const category = data.lookups.categoryById.get(suggestion.categoryId);
    const fields: Partial<EditorDraft> = {
      tagIds: suggestion.tagIds,
    };
    if (payee) {
      fields.payeeId = payee.id;
      fields.payeeName = payee.name;
    } else if (suggestion.newPayeeName) {
      fields.payeeName = suggestion.newPayeeName;
    }
    if (category && category.kind === draft.kind) {
      fields.categoryId = category.id;
    }
    if (
      suggestion.memberId &&
      isActiveMember(suggestion.memberId) &&
      !touched.has("member")
    ) {
      fields.memberId = suggestion.memberId;
    }
    update(fields);
    setSuggestState("idle");
  };

  const suggest = async () => {
    const text = [draft.payeeName, draft.note].join(" ").trim();
    if (text === "" || draft.accountId === null) return;
    const input = {
      text,
      amountMinor:
        (draft.kind === "income" ? 1 : -1) *
        Math.abs(parseMoney(draft.amountText, currency) ?? 0),
      date: draft.date,
      accountId: draft.accountId,
    };
    const local = suggestLabelsFromMemory(input, labelMemoryOf(data));
    if (local) {
      applySuggestion(local);
      return;
    }
    setSuggestState("busy");
    try {
      applySuggestion(await bankApiClient.suggest(input));
    } catch {
      setSuggestState("failed");
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      save(true);
    } else if (event.key === "Escape" && showClose && !event.defaultPrevented) {
      event.preventDefault();
      onClose();
    }
  };

  const confidence = existing?.aiConfidence ?? null;

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
  const saveLabel = paidToday
    ? t({ en: "Paid today", zh: "今天已付" })
    : isExpected
      ? t({ en: "Confirm", zh: "确认" })
      : t({ en: "Save", zh: "保存" });

  const amountLabel =
    draft.kind === "transfer"
      ? t({ en: "Amount sent", zh: "转出金额" })
      : draft.refund
        ? t({ en: "Amount refunded", zh: "退款金额" })
        : t({ en: "Amount", zh: "金额" });

  return (
    <form
      noValidate
      aria-labelledby="finance-editor-heading"
      css={stack.group}
      onKeyDown={handleKeyDown}
      onSubmit={(event) => {
        event.preventDefault();
        save(false);
      }}
    >
      <div css={[flex.between, styles.header]}>
        <h2
          id="finance-editor-heading"
          ref={headingRef}
          tabIndex={-1}
          css={[typeRole.h4, a11y.focusRing]}
        >
          {heading}
        </h2>
        {showClose ? (
          <Button
            look="ghost"
            size="sm"
            icon={<XIcon weight="bold" />}
            aria-label={t({ en: "Close", zh: "关闭" })}
            onClick={onClose}
          />
        ) : null}
      </div>

      {inReview ? (
        <Callout
          intent="info"
          title={
            <span css={cluster.tight}>
              {t({ en: "From the bank", zh: "来自银行" })}
              {confidence === null ? null : (
                <ConfidenceBadge confidence={confidence} />
              )}
            </span>
          }
        >
          <div css={stack.tight}>
            <span>
              {t({
                en: "Check the payee and category, then confirm.",
                zh: "请检查商家和分类，然后确认。",
              })}
            </span>
            <div>
              <Button
                size="sm"
                icon={<CheckIcon weight="bold" />}
                onClick={() => {
                  save(false);
                }}
              >
                {t({ en: "Looks right", zh: "没问题" })}
              </Button>
            </div>
          </div>
        </Callout>
      ) : null}

      <div css={stack.item}>
        <SegmentedControl
          aria-label={t({ en: "Kind", zh: "类型" })}
          fullWidth
          size="sm"
          value={draft.kind}
          options={[
            { value: "expense", label: t({ en: "Expense", zh: "支出" }) },
            { value: "income", label: t({ en: "Income", zh: "收入" }) },
            { value: "transfer", label: t({ en: "Transfer", zh: "转账" }) },
          ]}
          onChange={(kind) => {
            const category =
              draft.categoryId === null
                ? undefined
                : data.lookups.categoryById.get(draft.categoryId);
            const source =
              kind === "transfer" && isNew && !touched.has("account")
                ? usualTransferSource(data)
                : null;
            update(
              {
                kind,
                categoryId: category?.kind === kind ? category.id : null,
                refund: kind === "expense" ? draft.refund : false,
                ...(source === null ? {} : { accountId: source }),
              },
              ["kind"],
            );
          }}
        />

        <TextField
          ref={amountRef}
          label={amountLabel}
          size="lg"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          leading={currencySymbol(currency, locale)}
          value={draft.amountText}
          error={errorOf("amount")}
          css={[typeModifier.numeric, styles.amount]}
          onChange={(event) => {
            const amountText = event.target.value;
            update(
              needsToAmount && !touched.has("toAmount")
                ? {
                    amountText,
                    toAmountText: convertedToAmount(
                      amountText,
                      draft.toAccountId,
                    ),
                  }
                : { amountText },
            );
          }}
        />

        {draft.kind === "expense" ? (
          <div css={stack.tight}>
            <div>
              <Chip
                size="sm"
                isActive={draft.refund}
                icon={<ArrowUUpLeftIcon weight="bold" />}
                onClick={() => {
                  update({
                    refund: !draft.refund,
                    refundOfId: draft.refund ? null : draft.refundOfId,
                    ...(draft.refund
                      ? {}
                      : { paysDownAccountId: null, paysDownAmountText: "" }),
                  });
                }}
              >
                {t({ en: "Refund", zh: "退款" })}
              </Chip>
            </div>
            {draft.refund && refundCandidates.length > 0 ? (
              <Select
                label={t({ en: "Refund of", zh: "原支出" })}
                size="sm"
                value={draft.refundOfId ?? ""}
                onChange={(event) => {
                  update({ refundOfId: event.target.value || null });
                }}
              >
                <option value="">
                  {t({ en: "Not linked", zh: "不关联" })}
                </option>
                {refundCandidates.map((row) => (
                  <option key={row.id} value={row.id}>
                    {[
                      displayDay(row.date, locale, "weekday"),
                      formatMoney(row.amountMinor, data.baseCurrency, locale),
                      row.note,
                    ]
                      .filter((part) => part !== "")
                      .join(" · ")}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>
        ) : null}
      </div>

      {draft.kind === "transfer" ? (
        <div css={stack.item}>
          <Select
            ref={accountRef}
            label={t({ en: "From", zh: "转出账户" })}
            value={draft.accountId ?? ""}
            placeholder={t({ en: "Choose an account", zh: "选择账户" })}
            error={errorOf("account")}
            onChange={(event) => {
              update({ accountId: event.target.value || null }, ["account"]);
            }}
          >
            {accountSelectChildren}
          </Select>
          <Select
            ref={toAccountRef}
            label={t({ en: "To", zh: "转入账户" })}
            value={draft.toAccountId ?? ""}
            placeholder={t({ en: "Choose an account", zh: "选择账户" })}
            error={errorOf("toAccount")}
            onChange={(event) => {
              const toAccountId = event.target.value || null;
              update(
                touched.has("toAmount")
                  ? { toAccountId }
                  : {
                      toAccountId,
                      toAmountText: convertedToAmount(
                        draft.amountText,
                        toAccountId,
                      ),
                    },
                ["toAccount"],
              );
            }}
          >
            {toAccountSelectChildren}
          </Select>
          {needsToAmount ? (
            <TextField
              label={t({ en: "Amount received", zh: "转入金额" })}
              description={t({
                en: "Filled in from the latest exchange rate.",
                zh: "按最新汇率填入。",
              })}
              inputMode="decimal"
              autoComplete="off"
              leading={currencySymbol(toAccount.currency, locale)}
              value={draft.toAmountText}
              error={errorOf("toAmount")}
              css={typeModifier.numeric}
              onChange={(event) => {
                update({ toAmountText: event.target.value }, ["toAmount"]);
              }}
            />
          ) : null}
        </div>
      ) : (
        <div css={stack.item}>
          <div css={stack.tight}>
            <Combobox
              label={t({ en: "Payee", zh: "商家" })}
              value={draft.payeeName}
              options={payeeOptions}
              placeholder={t({
                en: "Tesco, Netflix, a friend…",
                zh: "例如 Tesco、Netflix、朋友…",
              })}
              createLabel={(name) => `${newPayeeLabel} “${name}”`}
              onValueChange={(payeeName) => {
                const chosen = data.payees.find(
                  (payee) => payee.id === draft.payeeId,
                );
                update({
                  payeeName,
                  payeeId: chosen?.name === payeeName ? chosen.id : null,
                });
                if (suggestState !== "idle") setSuggestState("idle");
              }}
              onSelect={(option) => {
                choosePayee(option.id, option.label);
              }}
            />
            {draft.payeeId === null && draft.payeeName.trim() !== "" ? (
              <div css={cluster.tight}>
                <Button
                  size="sm"
                  look="outline"
                  icon={<SparkleIcon weight="bold" />}
                  loading={suggestState === "busy"}
                  onClick={() => {
                    void suggest();
                  }}
                >
                  {t({ en: "Suggest", zh: "智能建议" })}
                </Button>
                {suggestState === "failed" ? (
                  <span role="status" css={[typeRole.caption, styles.muted]}>
                    {t({
                      en: "No suggestion right now. Pick a category below.",
                      zh: "暂时没有建议，请在下方选择分类。",
                    })}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <CategoryPicker
            categories={kindCategories}
            emojiById={data.lookups.categoryEmojiById}
            topIds={topIds}
            value={draft.categoryId}
            fromLastTime={fromLast.has("category")}
            error={errorOf("category")}
            firstChipRef={categoryRef}
            onChange={(categoryId) => {
              update({ categoryId }, ["category"]);
              setFromLast(
                new Set([...fromLast].filter((field) => field !== "category")),
              );
            }}
          />

          <div css={stack.tight}>
            <FieldLabel fromLastTime={fromLast.has("account")}>
              {t({ en: "Account", zh: "账户" })}
            </FieldLabel>
            <Select
              id="finance-editor-account"
              ref={accountRef}
              label={t({ en: "Account", zh: "账户" })}
              labelHidden
              value={draft.accountId ?? ""}
              placeholder={t({ en: "Choose an account", zh: "选择账户" })}
              error={errorOf("account")}
              onChange={(event) => {
                const accountId = event.target.value || null;
                const fields: Partial<EditorDraft> = { accountId };
                const owner = ownerOf(accountId);
                if (!touched.has("member") && owner !== null) {
                  fields.memberId = owner;
                }
                update(fields, ["account"]);
                setFromLast(
                  new Set([...fromLast].filter((field) => field !== "account")),
                );
              }}
            >
              {accountSelectChildren}
            </Select>
          </div>

          {draft.paysDownAccountId !== null ? (
            <div
              role="group"
              aria-labelledby="finance-editor-pays-down"
              css={stack.tight}
            >
              <span css={[flex.between, styles.paysDownHeader]}>
                <FieldLabel
                  id="finance-editor-pays-down"
                  fromLastTime={fromLast.has("paysDown")}
                >
                  {paysDownAccount?.kind === "receivable"
                    ? t({ en: "Also adds to", zh: "同时计入" })
                    : t({ en: "Also pays down", zh: "同时还款到" })}
                </FieldLabel>
                <Button
                  size="sm"
                  look="ghost"
                  icon={<XIcon weight="bold" />}
                  aria-label={t({
                    en: "Remove the second account",
                    zh: "移除第二个账户",
                  })}
                  onClick={() => {
                    update(
                      { paysDownAccountId: null, paysDownAmountText: "" },
                      ["paysDown"],
                    );
                  }}
                />
              </span>
              <div css={styles.paysDownRow}>
                <Select
                  ref={paysDownRef}
                  label={t({ en: "Loan or card", zh: "贷款或信用卡" })}
                  labelHidden
                  size="sm"
                  value={draft.paysDownAccountId}
                  error={errorOf("paysDown")}
                  onChange={(event) => {
                    update({ paysDownAccountId: event.target.value || null }, [
                      "paysDown",
                    ]);
                  }}
                >
                  {paysDownSelectChildren}
                </Select>
                <TextField
                  ref={paysDownAmountRef}
                  label={t({ en: "Amount repaid", zh: "还款金额" })}
                  labelHidden
                  size="sm"
                  inputMode="decimal"
                  autoComplete="off"
                  enterKeyHint="done"
                  leading={currencySymbol(
                    paysDownAccount?.currency ?? data.baseCurrency,
                    locale,
                  )}
                  value={draft.paysDownAmountText}
                  error={errorOf("paysDownAmount")}
                  css={typeModifier.numeric}
                  onChange={(event) => {
                    update({ paysDownAmountText: event.target.value }, [
                      "paysDown",
                    ]);
                  }}
                />
              </div>
            </div>
          ) : canPayDown ? (
            <div>
              <Button
                size="sm"
                look="ghost"
                icon={<PlusIcon weight="bold" />}
                onClick={() => {
                  const usable = data.openAccounts.filter(
                    (candidate) =>
                      PAYS_DOWN_KINDS.has(candidate.kind) &&
                      candidate.id !== draft.accountId,
                  );
                  const first =
                    usable.find((candidate) => candidate.kind === "loan") ??
                    usable.at(0);
                  if (!first) return;
                  update(
                    {
                      paysDownAccountId: first.id,
                      paysDownAmountText: draft.amountText,
                    },
                    ["paysDown"],
                  );
                }}
              >
                {t({
                  en: "Also pays down a loan or card",
                  zh: "同时还款到贷款或信用卡",
                })}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <div css={stack.item}>
        <DateChips
          value={draft.date}
          today={data.today}
          onChange={(date) => {
            update({ date }, ["date"]);
          }}
        />
        {valuation && valuation.on >= draft.date && !isExpected ? (
          <Callout intent="info">
            {`${t({
              en: "On or before the balance set on",
              zh: "此日期不晚于",
            })} ${displayDay(valuation.on, locale, "weekday")}${t({
              en: ", so the balance will not change.",
              zh: "的余额记录，余额不会变化。",
            })}`}
          </Callout>
        ) : null}

        {memberChoices.length > 1 ? (
          <div
            role="group"
            aria-labelledby="finance-editor-member"
            css={stack.tight}
          >
            <FieldLabel
              id="finance-editor-member"
              fromLastTime={fromLast.has("member")}
            >
              {t({ en: "Member", zh: "成员" })}
            </FieldLabel>
            <div css={cluster.tight}>
              {memberChoices.map((member) => (
                <Chip
                  key={member.id}
                  size="sm"
                  isActive={draft.memberId === member.id}
                  onClick={() => {
                    update({ memberId: member.id }, ["member"]);
                    setFromLast(
                      new Set(
                        [...fromLast].filter((field) => field !== "member"),
                      ),
                    );
                  }}
                >
                  {member.name}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        <TagPickerSlot
          data={data}
          value={draft.tagIds}
          fromLastTime={fromLast.has("tags")}
          onChange={(tagIds) => {
            update({ tagIds }, ["tags"]);
            setFromLast(
              new Set([...fromLast].filter((field) => field !== "tags")),
            );
          }}
        />

        <Textarea
          label={t({ en: "Note", zh: "备注" })}
          rows={2}
          autoGrow
          value={draft.note}
          onChange={(event) => {
            update({ note: event.target.value });
          }}
        />
      </div>

      {showRuleOffer ? (
        <Callout
          intent="info"
          icon={<RepeatIcon weight="bold" />}
          title={t({
            en: "This looks like it repeats",
            zh: "这笔交易似乎会重复",
          })}
        >
          <div css={stack.tight}>
            <span>
              {`${t({
                en: "Same amount ",
                zh: "金额相同，",
              })}${cadenceLabels[pattern.unit]}${t({
                en: ". Make it a rule so it shows up as Expected?",
                zh: "。设为周期规则，以后提前生成待确认交易？",
              })}`}
            </span>
            <div css={cluster.tight}>
              <Button size="sm" onClick={makeRule}>
                {t({ en: "Make it a rule", zh: "设为周期规则" })}
              </Button>
              <Button
                size="sm"
                look="ghost"
                onClick={() => {
                  if (existing.payeeId) ruleDeclines.add(existing.payeeId);
                  setRuleOffer("declined");
                }}
              >
                {t({ en: "Not this one", zh: "不用了" })}
              </Button>
            </div>
          </div>
        </Callout>
      ) : null}

      {duplicate ? (
        <Callout
          intent="warning"
          title={t({ en: "Looks like a duplicate", zh: "可能重复" })}
        >
          <div css={stack.tight}>
            <span>
              {`${displayDay(duplicate.date, locale, "weekday")} · ${formatMoney(
                duplicate.amountMinor,
                data.baseCurrency,
                locale,
              )}`}
            </span>
            <div css={cluster.tight}>
              <Button size="sm" look="primary" type="submit">
                {t({ en: "Keep both", zh: "都保留" })}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onOpenTransaction(duplicate.id);
                }}
              >
                {t({ en: "Open existing", zh: "打开已有交易" })}
              </Button>
            </div>
          </div>
        </Callout>
      ) : null}

      {failure ? (
        <Callout intent="danger" role="alert">
          {failure}
        </Callout>
      ) : null}

      {existing && !isExpected ? (
        <div css={cluster.tight}>
          {existing.kind === "expense" &&
          existing.amountMinor < 0 &&
          onRefund ? (
            <Button
              size="sm"
              look="outline"
              icon={<ArrowUUpLeftIcon weight="bold" />}
              onClick={() => {
                onRefund(existing.id);
              }}
            >
              {t({ en: "Refund", zh: "退款" })}
            </Button>
          ) : null}
          {existing.ruleId === null ? (
            <Button
              size="sm"
              look="outline"
              icon={<RepeatIcon weight="bold" />}
              onClick={makeRule}
            >
              {t({ en: "Make this a rule", zh: "设为周期规则" })}
            </Button>
          ) : null}
          {canPayInInstalments(existing, existingEntries) &&
          !instalmentsOpen ? (
            <Button
              size="sm"
              look="outline"
              icon={<CalendarDotsIcon weight="bold" />}
              onClick={() => {
                setInstalmentsOpen(true);
              }}
            >
              {t({ en: "Pay in instalments", zh: "分期付款" })}
            </Button>
          ) : null}
          <Button
            size="sm"
            look="ghost"
            icon={<TrashIcon weight="bold" />}
            onClick={remove}
          >
            {t({ en: "Delete", zh: "删除" })}
          </Button>
        </div>
      ) : null}

      {existing && instalmentsOpen ? (
        <InstalmentPanel
          data={data}
          transaction={existing}
          entries={existingEntries}
          tagIds={data.tagIdsByTransaction.get(existing.id) ?? []}
          onCreate={(mutations, undo, summary) => {
            try {
              apply(mutations);
            } catch {
              return false;
            }
            setInstalmentsOpen(false);
            undoable(summary, undo);
            return true;
          }}
          onCancel={() => {
            setInstalmentsOpen(false);
          }}
        />
      ) : null}

      <p css={[typeRole.caption, styles.muted, styles.hint]}>
        {t({
          en: "Enter saves. ⌘ or Ctrl + Enter saves and starts another.",
          zh: "按 Enter 保存；⌘ 或 Ctrl + Enter 保存并再记一笔。",
        })}
      </p>

      <div
        css={[
          cluster.tight,
          styles.footer,
          keyboardInset > 0 && styles.lift(`${String(keyboardInset)}px`),
        ]}
      >
        <Button type="submit" look="primary">
          {saveLabel}
        </Button>
        {isNew ? (
          <Button
            onClick={() => {
              save(true);
            }}
          >
            {t({ en: "Save and add another", zh: "保存并再记一笔" })}
          </Button>
        ) : null}
        {isExpected ? (
          <Button look="ghost" onClick={remove}>
            {t({ en: "Skip", zh: "跳过" })}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function TagPickerSlot({
  data,
  value,
  fromLastTime,
  onChange,
}: {
  data: EditorData;
  value: readonly string[];
  fromLastTime: boolean;
  onChange: (tagIds: string[]) => void;
}) {
  const store = useReplicaStore();
  return (
    <TagPicker
      tags={data.tags}
      value={value}
      fromLastTime={fromLastTime}
      onChange={onChange}
      onCreate={(name) => {
        const id = crypto.randomUUID();
        store.applyLocal({
          name: "upsertTag",
          args: { id, name: name.slice(0, 200), position: data.tags.length },
        });
        return id;
      }}
    />
  );
}

const styles = stylex.create({
  header: {
    gap: rhythm.tight,
  },
  amount: {
    fontWeight: font.weight_6,
  },
  muted: {
    color: color.fgMuted,
  },
  hint: {
    display: { default: "none", [pointer.canHover]: "block" },
  },
  footer: {
    position: "sticky",
    insetBlockEnd: `calc(-1 * (${PANE_END_PADDING}))`,
    zIndex: 1,
    paddingBlockStart: space._3,
    paddingBlockEnd: `calc(${space._3} + env(safe-area-inset-bottom))`,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
    backgroundColor: color.bgSurface,
  },
  lift: (inset: string) => ({
    transform: `translateY(calc(-1 * ${inset}))`,
  }),
  paysDownHeader: {
    gap: rhythm.tight,
  },
  paysDownRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 9rem)",
    gap: rhythm.tight,
    alignItems: "start",
  },
});
