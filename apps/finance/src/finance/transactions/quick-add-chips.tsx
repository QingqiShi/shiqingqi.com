"use client";

import { ArrowDownLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowDownLeft";
import { ArrowLineRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowLineRight";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { BankIcon } from "@phosphor-icons/react/dist/ssr/Bank";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { CoinsIcon } from "@phosphor-icons/react/dist/ssr/Coins";
import { HandCoinsIcon } from "@phosphor-icons/react/dist/ssr/HandCoins";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { StorefrontIcon } from "@phosphor-icons/react/dist/ssr/Storefront";
import { TagIcon } from "@phosphor-icons/react/dist/ssr/Tag";
import { TreeStructureIcon } from "@phosphor-icons/react/dist/ssr/TreeStructure";
import { UserIcon } from "@phosphor-icons/react/dist/ssr/User";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Chip } from "@tuja/ui/components/chip";
import { Popover } from "@tuja/ui/components/popover";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { color, measure, space } from "@tuja/ui/tokens.stylex";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { currencySymbol } from "../accounts/currency-symbol.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { CategoryPicker } from "../editor/category-picker.tsx";
import { DateChips } from "../editor/date-chips.tsx";
import type { EditorDraft } from "../editor/editor-draft.ts";
import { FieldLabel } from "../editor/field-label.tsx";
import {
  fieldStatus,
  type FieldMarks,
  type MarkedField,
} from "../editor/marked-fields.ts";
import { rankPayees } from "../editor/rank-payees.ts";
import { topCategories } from "../editor/top-categories.ts";
import {
  PAYS_DOWN_KINDS,
  TagPickerSlot,
} from "../editor/transaction-editor.tsx";
import { useEditorData, type EditorData } from "../editor/use-editor-data.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import { currencyOfAccount } from "./quick-add-draft.ts";
import type { TransactionKind } from "./transaction-filters.ts";
import { fieldsOfRunnerUp } from "./use-quick-add-draft.ts";
import { useTransactionKindLabels } from "./use-transaction-kind-labels.ts";

const KINDS: readonly TransactionKind[] = ["expense", "income", "transfer"];

const KIND_ICONS: Record<TransactionKind, ReactNode> = {
  expense: <ArrowUpRightIcon weight="bold" />,
  income: <ArrowDownLeftIcon weight="bold" />,
  transfer: <ArrowsLeftRightIcon weight="bold" />,
};

const FIELD_ICONS: Record<Exclude<MarkedField, "kind">, ReactNode> = {
  amount: <CoinsIcon weight="bold" />,
  payee: <StorefrontIcon weight="bold" />,
  category: <TreeStructureIcon weight="bold" />,
  account: <BankIcon weight="bold" />,
  toAccount: <ArrowLineRightIcon weight="bold" />,
  paysDown: <HandCoinsIcon weight="bold" />,
  date: <CalendarDotsIcon weight="bold" />,
  member: <UserIcon weight="bold" />,
  tags: <TagIcon weight="bold" />,
};

/** The account chips a picker offers, under the name of each account group. */
function AccountChoices({
  data,
  value,
  keep,
  onPick,
}: {
  data: EditorData;
  value: string | null;
  keep: (account: AccountRow) => boolean;
  onPick: (accountId: string) => void;
}) {
  const groups = data.accountGroups
    .map((group) => ({
      group,
      accounts: data.openAccounts.filter(
        (account) => account.groupId === group.id && keep(account),
      ),
    }))
    .filter(({ accounts }) => accounts.length > 0);
  return groups.map(({ group, accounts }) => (
    <div key={group.id} css={stack.tight}>
      <Text look="caption" tone="muted">
        {group.name}
      </Text>
      <div css={cluster.tight}>
        {accounts.map((account) => (
          <Chip
            key={account.id}
            size="xs"
            isActive={account.id === value}
            onClick={() => {
              onPick(account.id);
            }}
          >
            {data.lookups.accountLabelById.get(account.id) ?? account.name}
          </Chip>
        ))}
      </div>
    </div>
  ));
}

interface QuickAddChipsProps {
  draft: EditorDraft;
  marks: FieldMarks;
  touched: ReadonlySet<MarkedField>;
  /** A newer reading is on its way, so the chips show the one before. */
  muted: boolean;
  onChange: (field: MarkedField, fields: Partial<EditorDraft>) => void;
}

/**
 * What quick add read, as one chip for each field under the line. A chip to
 * check has a warning tint and ends in "?", and a field a save needs has a
 * dashed outline. Each chip opens its field's picker; for a value to check,
 * the AI's next best value comes first.
 */
export function QuickAddChips({
  draft,
  marks,
  touched,
  muted,
  onChange,
}: QuickAddChipsProps) {
  const data = useEditorData();
  const locale = useLocale();
  const categoryName = useCategoryDisplayName();
  const kindLabels = useTransactionKindLabels();
  const [openField, setOpenField] = useState<MarkedField | null>(null);

  const names: Record<MarkedField, string> = {
    kind: t({ en: "Kind", zh: "类型" }),
    amount: t({ en: "Amount", zh: "金额" }),
    payee: t({ en: "Payee", zh: "商家" }),
    category: t({ en: "Category", zh: "分类" }),
    account:
      draft.kind === "transfer"
        ? t({ en: "From", zh: "转出账户" })
        : t({ en: "Account", zh: "账户" }),
    toAccount: t({ en: "To", zh: "转入账户" }),
    paysDown: t({ en: "Also pays down", zh: "同时还款到" }),
    date: t({ en: "Date", zh: "日期" }),
    member: t({ en: "Member", zh: "成员" }),
    tags: t({ en: "Tags", zh: "标签" }),
  };
  const missingLabels: Partial<Record<MarkedField, string>> = {
    amount: t({ en: "Missing amount", zh: "缺少金额" }),
    category: t({ en: "Missing category", zh: "缺少分类" }),
    account: t({ en: "Missing account", zh: "缺少账户" }),
    toAccount: t({ en: "Missing target account", zh: "缺少转入账户" }),
  };
  const nameSeparator = t({ en: ": ", zh: "：" });
  const notSure = t({ en: ", not sure", zh: "，不确定" });
  const noPayee = t({ en: "No payee", zh: "无商家" });
  const todayLabel = t({ en: "Today", zh: "今天" });
  const yesterdayLabel = t({ en: "Yesterday", zh: "昨天" });
  const orLabel = t({ en: "Or", zh: "也可能是" });
  const removeLabel = t({ en: "Remove", zh: "移除" });
  const payeePlaceholder = t({
    en: "Tesco, Netflix, a friend…",
    zh: "例如 Tesco、Netflix、朋友…",
  });

  const currency = currencyOfAccount(data, draft.accountId);
  const accountLabel = (accountId: string | null) =>
    accountId === null
      ? undefined
      : data.lookups.accountLabelById.get(accountId);

  /** A field's value as the chip shows it, or undefined for none. */
  const valueOf = (field: MarkedField, of: EditorDraft) => {
    switch (field) {
      case "kind":
        return kindLabels[of.kind];
      case "amount": {
        const minor = parseMoney(of.amountText, currency);
        if (minor === null) return of.amountText.trim() || undefined;
        return formatMoney(Math.abs(minor), currency, locale);
      }
      case "payee":
        return of.payeeName.trim() || undefined;
      case "category": {
        const category =
          of.categoryId === null
            ? undefined
            : data.lookups.categoryById.get(of.categoryId);
        if (!category) return undefined;
        const parent =
          category.parentId === null
            ? undefined
            : data.lookups.categoryById.get(category.parentId);
        return parent
          ? `${categoryName(parent)} › ${categoryName(category)}`
          : categoryName(category);
      }
      case "account":
        return accountLabel(of.accountId);
      case "toAccount":
        return accountLabel(of.toAccountId);
      case "paysDown":
        return accountLabel(of.paysDownAccountId);
      case "date":
        if (of.date === data.today) return todayLabel;
        if (of.date === addDays(data.today, -1)) return yesterdayLabel;
        return displayDay(of.date, locale, "weekday");
      case "member":
        return of.memberId === null
          ? undefined
          : data.lookups.memberById.get(of.memberId)?.name;
      case "tags":
        return (
          of.tagIds
            .map((id) => data.tags.find((tag) => tag.id === id)?.name)
            .filter((name) => name !== undefined)
            .join(", ") || undefined
        );
    }
  };

  const fields: MarkedField[] = [
    "kind",
    "amount",
    ...(draft.kind === "transfer"
      ? (["account", "toAccount"] as const)
      : (["payee", "category", "account"] as const)),
    ...(draft.kind !== "transfer" && draft.paysDownAccountId !== null
      ? (["paysDown"] as const)
      : []),
    "date",
    ...(marks.member || touched.has("member") ? (["member"] as const) : []),
    ...(draft.tagIds.length > 0 ? (["tags"] as const) : []),
  ];

  const closeOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    setOpenField(null);
  };

  const pickerOf = (
    field: MarkedField,
    pick: (next: Partial<EditorDraft>) => void,
  ) => {
    const keep = (next: Partial<EditorDraft>) => {
      onChange(field, next);
    };
    switch (field) {
      case "kind":
        return (
          <div css={stack.tight}>
            <FieldLabel>{names.kind}</FieldLabel>
            <div css={cluster.tight}>
              {KINDS.map((kind) => (
                <Chip
                  key={kind}
                  size="xs"
                  icon={KIND_ICONS[kind]}
                  isActive={draft.kind === kind}
                  onClick={() => {
                    pick({ kind });
                  }}
                >
                  {kindLabels[kind]}
                </Chip>
              ))}
            </div>
          </div>
        );
      case "amount":
        return (
          <div css={stack.tight}>
            <FieldLabel>{names.amount}</FieldLabel>
            <TextField
              label={names.amount}
              labelHidden
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="done"
              leading={currencySymbol(currency, locale)}
              value={draft.amountText}
              css={typeModifier.numeric}
              onChange={(event) => {
                keep({ amountText: event.target.value });
              }}
              onKeyDown={closeOnEnter}
            />
          </div>
        );
      case "payee": {
        const ranked = rankPayees(draft.payeeName, data.payees, {
          lastUsedById: data.lastUsedByPayee,
          limit: 6,
        });
        return (
          <div css={stack.tight}>
            <FieldLabel>{names.payee}</FieldLabel>
            <TextField
              label={names.payee}
              labelHidden
              autoComplete="off"
              enterKeyHint="done"
              placeholder={payeePlaceholder}
              value={draft.payeeName}
              onChange={(event) => {
                const payeeName = event.target.value;
                keep({
                  payeeName,
                  payeeId:
                    data.payees.find((payee) => payee.name === payeeName)?.id ??
                    null,
                });
              }}
              onKeyDown={closeOnEnter}
            />
            {ranked.length > 0 ? (
              <div css={cluster.tight}>
                {ranked.map((payee) => (
                  <Chip
                    key={payee.id}
                    size="xs"
                    isActive={payee.id === draft.payeeId}
                    onClick={() => {
                      pick({ payeeId: payee.id, payeeName: payee.name });
                    }}
                  >
                    {payee.name}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>
        );
      }
      case "category": {
        if (draft.kind === "transfer") return null;
        const kindCategories = data.categories.filter(
          (category) => category.kind === draft.kind,
        );
        return (
          <CategoryPicker
            categories={kindCategories}
            emojiById={data.lookups.categoryEmojiById}
            topIds={topCategories({
              kind: draft.kind,
              payeeHistory:
                draft.payeeId === null
                  ? []
                  : (data.byPayee.get(draft.payeeId) ?? []),
              recent: data.transactions,
              categories: kindCategories,
            })}
            value={draft.categoryId}
            onChange={(categoryId) => {
              pick({ categoryId });
            }}
          />
        );
      }
      case "account":
      case "toAccount":
        return (
          <div css={stack.tight}>
            <FieldLabel>{names[field]}</FieldLabel>
            <AccountChoices
              data={data}
              value={field === "account" ? draft.accountId : draft.toAccountId}
              keep={(account) =>
                field === "account" || account.id !== draft.accountId
              }
              onPick={(accountId) => {
                pick(
                  field === "account"
                    ? { accountId }
                    : { toAccountId: accountId },
                );
              }}
            />
          </div>
        );
      case "paysDown":
        return (
          <div css={stack.tight}>
            <FieldLabel>{names.paysDown}</FieldLabel>
            <AccountChoices
              data={data}
              value={draft.paysDownAccountId}
              keep={(account) =>
                PAYS_DOWN_KINDS.has(account.kind) &&
                account.id !== draft.accountId
              }
              onPick={(paysDownAccountId) => {
                pick({ paysDownAccountId });
              }}
            />
            <div>
              <Chip
                size="xs"
                icon={<XIcon weight="bold" />}
                onClick={() => {
                  pick({ paysDownAccountId: null, paysDownAmountText: "" });
                }}
              >
                {removeLabel}
              </Chip>
            </div>
          </div>
        );
      case "date":
        return (
          <DateChips
            value={draft.date}
            today={data.today}
            onChange={(date) => {
              pick({ date });
            }}
          />
        );
      case "member":
        return (
          <div css={stack.tight}>
            <FieldLabel>{names.member}</FieldLabel>
            <div css={cluster.tight}>
              {data.members.map((member) => (
                <Chip
                  key={member.id}
                  size="xs"
                  isActive={draft.memberId === member.id}
                  onClick={() => {
                    pick({ memberId: member.id });
                  }}
                >
                  {member.name}
                </Chip>
              ))}
            </div>
          </div>
        );
      case "tags":
        return (
          <TagPickerSlot
            data={data}
            value={draft.tagIds}
            onChange={(tagIds) => {
              keep({ tagIds });
            }}
          />
        );
    }
  };

  return (
    <div css={[cluster.tight, transition.opacity, muted && styles.muted]}>
      {fields.map((field) => {
        const status = fieldStatus(draft, marks, field);
        const value = valueOf(field, draft);
        const runnerUp = marks[field]?.runnerUp;
        const runnerUpValue =
          status === "unsure" && runnerUp !== undefined
            ? valueOf(field, {
                ...draft,
                ...fieldsOfRunnerUp(data, field, runnerUp),
              })
            : undefined;
        const shown =
          status === "missing"
            ? (missingLabels[field] ?? names[field])
            : (value ?? (field === "payee" ? noPayee : names[field]));
        const label =
          status === "missing"
            ? shown
            : `${names[field]}${nameSeparator}${shown}${status === "unsure" ? notSure : ""}`;
        const pick = (next: Partial<EditorDraft>) => {
          onChange(field, next);
          setOpenField(null);
        };
        return (
          <Popover
            key={field}
            open={openField === field}
            onOpenChange={(open) => {
              setOpenField(open ? field : null);
            }}
            aria-label={names[field]}
            css={styles.popover}
            trigger={(props) => (
              <Chip
                {...props}
                size="xs"
                icon={
                  field === "kind" ? KIND_ICONS[draft.kind] : FIELD_ICONS[field]
                }
                title={names[field]}
                aria-label={label}
                css={[
                  styles.fieldChip,
                  status === "unsure" && styles.unsure,
                  status === "missing" && styles.missing,
                  field === "amount" && typeModifier.numeric,
                  field === "payee" && value === undefined && styles.empty,
                ]}
              >
                <span css={truncate.base}>
                  {status === "unsure" ? `${shown}?` : shown}
                </span>
              </Chip>
            )}
          >
            <div css={stack.item}>
              {runnerUpValue === undefined || runnerUp === undefined ? null : (
                <div css={cluster.tight}>
                  <Text look="caption" tone="muted">
                    {orLabel}
                  </Text>
                  <Chip
                    size="xs"
                    icon={<SparkleIcon weight="bold" />}
                    onClick={() => {
                      pick(fieldsOfRunnerUp(data, field, runnerUp));
                    }}
                  >
                    {runnerUpValue}
                  </Chip>
                </div>
              )}
              {openField === field ? pickerOf(field, pick) : null}
            </div>
          </Popover>
        );
      })}
    </div>
  );
}

const styles = stylex.create({
  muted: {
    opacity: 0.55,
  },
  fieldChip: {
    maxInlineSize: "100%",
  },
  unsure: {
    backgroundColor: color.bgWarningSubtle,
    color: color.fgWarning,
  },
  missing: {
    borderStyle: "dashed",
    borderColor: color.borderControl,
    backgroundColor: "transparent",
  },
  empty: {
    color: color.fgMuted,
  },
  popover: {
    maxInlineSize: `min(${measure.short}, calc(100dvw - ${space._1} * 2))`,
  },
});
