"use client";

import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Select } from "@tuja/ui/components/select";
import type { Ref } from "react";
import { t } from "#src/i18n.ts";
import { useBaseCurrency } from "../accounts/use-base-currency.ts";
import { Combobox } from "../editor/combobox.tsx";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import { categoryTree } from "./category-tree.ts";

/** The fields a Rule needs only when it is made from scratch. */
export interface NewRuleFieldsDraft {
  kind: "expense" | "income" | "transfer";
  payeeText: string;
  payeeId: string | null;
  accountId: string;
  toAccountId: string;
  categoryId: string;
}

interface NewRuleFieldsProps {
  value: NewRuleFieldsDraft;
  onChange: (value: NewRuleFieldsDraft) => void;
  /** Called when a Payee is picked, so the form can fill in the name. */
  onPayeePicked: (name: string) => void;
  payeeRef: Ref<HTMLInputElement>;
}

const SHOWN_PAYEES = 8;

/** Kind, Payee, account and Category for a new Rule; picking a Payee fills in its usual account and Category. */
export function NewRuleFields({
  value,
  onChange,
  onPayeePicked,
  payeeRef,
}: NewRuleFieldsProps) {
  const payees = useReplica(liveRowSelectors.payees);
  const accounts = useReplica(liveRowSelectors.accounts);
  const categories = useReplica(liveRowSelectors.categories);
  const baseCurrency = useBaseCurrency();

  const open = accounts.filter((account) => account.closedOn === null);
  const accountLabel = (account: (typeof open)[number]) =>
    account.currency === baseCurrency
      ? account.name
      : `${account.name} · ${account.currency}`;
  const from = open.find((account) => account.id === value.accountId);
  const needle = value.payeeText.trim().toLocaleLowerCase();
  const payeeOptions = payees
    .filter(
      (payee) =>
        payee.mergedIntoId === null &&
        (needle === "" || payee.name.toLocaleLowerCase().includes(needle)),
    )
    .sort(
      (a, b) =>
        Number(!a.name.toLocaleLowerCase().startsWith(needle)) -
        Number(!b.name.toLocaleLowerCase().startsWith(needle)),
    )
    .slice(0, SHOWN_PAYEES)
    .map((payee) => ({ id: payee.id, label: payee.name }));
  const categoryOptions =
    value.kind === "transfer"
      ? []
      : categoryTree(categories, value.kind).filter(
          (node) => node.category.archivedAt === null,
        );
  const displayName = useCategoryDisplayName();
  const pickAccount = t({ en: "Pick an account", zh: "选择账户" });
  const newPayeeLabel = t({ en: "New payee:", zh: "新商家：" });

  return (
    <>
      <SegmentedControl
        aria-label={t({ en: "Kind", zh: "类型" })}
        fullWidth
        options={[
          { value: "expense", label: t({ en: "Expense", zh: "支出" }) },
          { value: "income", label: t({ en: "Income", zh: "收入" }) },
          { value: "transfer", label: t({ en: "Transfer", zh: "转账" }) },
        ]}
        value={value.kind}
        onChange={(kind) => {
          onChange({ ...value, kind, categoryId: "" });
        }}
      />
      <Combobox
        label={t({ en: "Payee", zh: "商家" })}
        inputRef={payeeRef}
        value={value.payeeText}
        options={payeeOptions}
        createLabel={(text) => `${newPayeeLabel} ${text}`}
        onValueChange={(text) => {
          onChange({ ...value, payeeText: text, payeeId: null });
        }}
        onSelect={(option) => {
          const payee = payees.find((row) => row.id === option.id);
          const category = categories.find(
            (row) => row.id === payee?.defaultCategoryId,
          );
          const account = open.find(
            (row) => row.id === payee?.defaultAccountId,
          );
          onChange({
            ...value,
            payeeText: option.label,
            payeeId: option.id,
            categoryId:
              value.categoryId === "" &&
              category?.kind === value.kind &&
              category.archivedAt === null
                ? category.id
                : value.categoryId,
            accountId:
              value.accountId === "" && account ? account.id : value.accountId,
          });
          onPayeePicked(option.label);
        }}
        onCreate={(text) => {
          onChange({ ...value, payeeText: text, payeeId: null });
          onPayeePicked(text);
        }}
      />
      <Select
        label={
          value.kind === "transfer"
            ? t({ en: "From", zh: "转出账户" })
            : t({ en: "Account", zh: "账户" })
        }
        value={value.accountId}
        options={[
          { value: "", label: pickAccount, disabled: true },
          ...open.map((account) => ({
            value: account.id,
            label: accountLabel(account),
          })),
        ]}
        onChange={(event) => {
          onChange({ ...value, accountId: event.target.value });
        }}
      />
      {value.kind === "transfer" ? (
        <Select
          label={t({ en: "To", zh: "转入账户" })}
          value={value.toAccountId}
          options={[
            { value: "", label: pickAccount, disabled: true },
            ...open
              .filter(
                (account) =>
                  account.id !== value.accountId &&
                  (from === undefined || account.currency === from.currency),
              )
              .map((account) => ({
                value: account.id,
                label: accountLabel(account),
              })),
          ]}
          onChange={(event) => {
            onChange({ ...value, toAccountId: event.target.value });
          }}
        />
      ) : (
        <Select
          label={t({ en: "Category", zh: "分类" })}
          value={value.categoryId}
          options={[
            {
              value: "",
              label: t({ en: "Pick a category", zh: "选择分类" }),
              disabled: true,
            },
            ...categoryOptions.map(({ category, depth }) => ({
              value: category.id,
              label: `${"  ".repeat(depth)}${category.emoji ? `${category.emoji} ` : ""}${displayName(category)}`,
            })),
          ]}
          onChange={(event) => {
            onChange({ ...value, categoryId: event.target.value });
          }}
        />
      )}
    </>
  );
}
