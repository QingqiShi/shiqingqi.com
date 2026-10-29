"use client";

import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { useDeferredValue, useRef, useState } from "react";
import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type { PayeeRow } from "../sync/row-schemas.ts";
import { categoryTree } from "./category-tree.ts";
import { EditSheet } from "./edit-sheet.tsx";
import { SettingsPanel } from "./settings-panel.tsx";
import { useApplyMutations } from "./use-apply-mutations.ts";

const SHOWN = 150;

interface Draft {
  payee: PayeeRow;
  name: string;
  note: string;
  defaultCategoryId: string;
  mergeIntoId: string;
}

/** The Payees: search, rename, set the usual category, merge a duplicate into another. */
export function PayeesSettings() {
  const locale = useLocale();
  const payees = useReplica(liveRowSelectors.payees);
  const categories = useReplica(liveRowSelectors.categories);
  const apply = useApplyMutations();
  const displayName = useCategoryDisplayName();
  const nameRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [draft, setDraft] = useState<Draft | null>(null);

  const active = payees.filter((payee) => payee.mergedIntoId === null);
  const needle = deferredQuery.trim().toLocaleLowerCase();
  const matches =
    needle === ""
      ? active
      : active.filter((payee) =>
          payee.name.toLocaleLowerCase().includes(needle),
        );
  const categoryNames = new Map(
    categories.map((category) => [category.id, displayName(category)]),
  );
  const categoryOptions = [
    ...categoryTree(categories, "expense"),
    ...categoryTree(categories, "income"),
  ].filter((node) => node.category.archivedAt === null);
  const expenseLabel = t({ en: "Expense", zh: "支出" });
  const incomeLabel = t({ en: "Income", zh: "收入" });
  const moreLabel = t({
    en: "more. Search to narrow the list.",
    zh: "个未显示，可搜索缩小范围。",
  });
  const payeeSaved = t({ en: "Payee saved", zh: "商家已保存" });

  function save() {
    if (!draft || draft.name.trim() === "") return false;
    const mutations: LocalMutationInput[] = [
      {
        name: "upsertPayee",
        args: {
          id: draft.payee.id,
          name: draft.name.trim(),
          note: draft.note,
          defaultCategoryId:
            draft.defaultCategoryId === "" ? null : draft.defaultCategoryId,
        },
      },
    ];
    if (draft.mergeIntoId !== "") {
      mutations.push({
        name: "mergePayee",
        args: { fromId: draft.payee.id, intoId: draft.mergeIntoId },
      });
    }
    return apply(mutations, { message: payeeSaved });
  }

  return (
    <SettingsPanel
      title={t({ en: "Payees", zh: "商家" })}
      description={t({
        en: "Who money goes to or comes from. A payee's usual category fills in new transactions.",
        zh: "钱的去向或来源。商家的常用分类会自动填入新交易。",
      })}
    >
      <TextField
        type="search"
        label={t({ en: "Search payees", zh: "搜索商家" })}
        labelHidden
        placeholder={t({ en: "Search payees", zh: "搜索商家" })}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      <List>
        {matches.slice(0, SHOWN).map((payee) => (
          <ListRow
            key={payee.id}
            detail={[
              payee.defaultCategoryId === null
                ? ""
                : (categoryNames.get(payee.defaultCategoryId) ?? ""),
              payee.note,
            ]
              .filter((part) => part !== "")
              .join(" · ")}
            onClick={() => {
              setDraft({
                payee,
                name: payee.name,
                note: payee.note,
                defaultCategoryId: payee.defaultCategoryId ?? "",
                mergeIntoId: "",
              });
            }}
          >
            {payee.name}
          </ListRow>
        ))}
      </List>
      {matches.length > SHOWN ? (
        <Text look="bodySmall" tone="muted">
          {`${new Intl.NumberFormat(locale).format(matches.length - SHOWN)} ${moreLabel}`}
        </Text>
      ) : null}
      <EditSheet
        isOpen={draft !== null}
        onClose={() => {
          setDraft(null);
        }}
        title={t({ en: "Edit payee", zh: "编辑商家" })}
        initialFocusRef={nameRef}
        onSave={save}
      >
        {draft ? (
          <>
            <TextField
              ref={nameRef}
              label={t({ en: "Name", zh: "名称" })}
              value={draft.name}
              onChange={(event) => {
                setDraft({ ...draft, name: event.target.value });
              }}
            />
            <Select
              label={t({ en: "Usual category", zh: "常用分类" })}
              value={draft.defaultCategoryId}
              options={[
                {
                  value: "",
                  label: t({
                    en: "From recent transactions",
                    zh: "按最近交易",
                  }),
                },
                ...categoryOptions.map(({ category, depth }) => ({
                  value: category.id,
                  label: `${category.kind === "expense" ? expenseLabel : incomeLabel} · ${"  ".repeat(depth)}${displayName(category)}`,
                })),
              ]}
              onChange={(event) => {
                setDraft({ ...draft, defaultCategoryId: event.target.value });
              }}
            />
            <Textarea
              label={t({ en: "Note", zh: "备注" })}
              value={draft.note}
              onChange={(event) => {
                setDraft({ ...draft, note: event.target.value });
              }}
            />
            <Select
              label={t({ en: "Merge into", zh: "合并到" })}
              description={t({
                en: "Moves every transaction and rule of this payee to the one you pick, then removes this one.",
                zh: "把此商家的所有交易和周期规则移到所选商家，然后删除此商家。",
              })}
              value={draft.mergeIntoId}
              options={[
                { value: "", label: t({ en: "Keep separate", zh: "不合并" }) },
                ...active
                  .filter((payee) => payee.id !== draft.payee.id)
                  .map((payee) => ({ value: payee.id, label: payee.name })),
              ]}
              onChange={(event) => {
                setDraft({ ...draft, mergeIntoId: event.target.value });
              }}
            />
          </>
        ) : null}
      </EditSheet>
    </SettingsPanel>
  );
}
