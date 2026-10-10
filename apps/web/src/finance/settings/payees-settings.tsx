"use client";

import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { fieldStyles } from "@tuja/ui/components/field-shared.stylex";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { useDeferredValue, useRef, useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { normaliseBankText } from "../ai/normalise-bank-text.ts";
import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type { PayeeRow } from "../sync/row-schemas.ts";
import { categoryTree } from "./category-tree.ts";
import { EditSheet } from "./edit-sheet.tsx";
import { SettingsList } from "./settings-list.tsx";
import { SettingsPanel } from "./settings-panel.tsx";
import { SettingsRow } from "./settings-row.tsx";
import { useApplyMutations } from "./use-apply-mutations.ts";

const SHOWN = 150;

interface Draft {
  payee: PayeeRow;
  name: string;
  note: string;
  defaultCategoryId: string;
  mergeIntoId: string;
  /** Bank names to add on save, in their normalised form. */
  newAliases: string[];
  aliasText: string;
}

/** The Payees: search, rename, set the usual category, add bank names, merge a duplicate into another. */
export function PayeesSettings() {
  const locale = useLocale();
  const payees = useReplica(liveRowSelectors.payees);
  const categories = useReplica(liveRowSelectors.categories);
  const aliases = useReplica((snapshot) => snapshot.tables.payeeAliases);
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
  const aliasLabels = {
    belongsTo: t({ en: "now belongs to", zh: "目前属于" }),
    moves: t({
      en: "; saving moves it to this payee.",
      zh: "；保存后会移到此商家。",
    }),
  };
  const aliasesOf = (payeeId: string) =>
    [...aliases.values()]
      .filter((alias) => alias.payeeId === payeeId)
      .map((alias) => alias.alias);

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
          ...(draft.newAliases.length > 0
            ? { addAliases: draft.newAliases }
            : {}),
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

  const draftAliases = draft ? aliasesOf(draft.payee.id) : [];
  const payeeNames = new Map(payees.map((payee) => [payee.id, payee.name]));
  const ownerOfAlias = (alias: string) => {
    const payeeId = aliases.get(alias)?.payeeId;
    return payeeId === undefined || payeeId === draft?.payee.id
      ? null
      : (payeeNames.get(payeeId) ?? null);
  };

  function addAlias() {
    if (!draft) return;
    const alias = normaliseBankText(draft.aliasText);
    if (
      alias === "" ||
      draftAliases.includes(alias) ||
      draft.newAliases.includes(alias)
    ) {
      setDraft({ ...draft, aliasText: "" });
      return;
    }
    setDraft({
      ...draft,
      aliasText: "",
      newAliases: [...draft.newAliases, alias],
    });
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
      <SettingsList>
        {matches.slice(0, SHOWN).map((payee) => (
          <SettingsRow
            key={payee.id}
            title={payee.name}
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
                newAliases: [],
                aliasText: "",
              });
            }}
          />
        ))}
      </SettingsList>
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
            <div css={stack.tight}>
              <span css={[typeRole.control, fieldStyles.label]}>
                {t({ en: "Bank names", zh: "银行名称" })}
              </span>
              <Text look="caption" tone="muted">
                {t({
                  en: "How this payee appears on bank statements. A bank transaction with one of these names gets this payee.",
                  zh: "此商家在银行账单上显示的名称。带有这些名称的银行交易会自动归到此商家。",
                })}
              </Text>
              {draftAliases.length + draft.newAliases.length > 0 ? (
                <ul css={[cluster.tight, styles.aliases]}>
                  {[...draftAliases, ...draft.newAliases].map((alias) => (
                    <li key={alias}>
                      <Badge size="sm" intent="neutral">
                        {alias}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
              {draft.newAliases.flatMap((alias) => {
                const owner = ownerOfAlias(alias);
                return owner === null
                  ? []
                  : [
                      <Text key={alias} look="caption" tone="muted">
                        {`${alias} ${aliasLabels.belongsTo} ${owner}${aliasLabels.moves}`}
                      </Text>,
                    ];
              })}
              <div css={[cluster.tight, styles.aliasAdd]}>
                <TextField
                  label={t({ en: "Add a bank name", zh: "添加银行名称" })}
                  labelHidden
                  placeholder={t({
                    en: "Add a bank name, such as TESCO STORES",
                    zh: "添加银行名称，例如 TESCO STORES",
                  })}
                  value={draft.aliasText}
                  css={styles.aliasField}
                  onChange={(event) => {
                    setDraft({ ...draft, aliasText: event.target.value });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addAlias();
                    }
                  }}
                />
                <Button
                  size="sm"
                  look="outline"
                  disabled={normaliseBankText(draft.aliasText) === ""}
                  onClick={addAlias}
                >
                  {t({ en: "Add", zh: "添加" })}
                </Button>
              </div>
            </div>
            <Select
              label={t({ en: "Merge into", zh: "合并到" })}
              description={t({
                en: "Moves every transaction, bank name and rule of this payee to the one you pick, then removes this one.",
                zh: "把此商家的所有交易、银行名称和周期规则移到所选商家，然后删除此商家。",
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

const styles = stylex.create({
  aliases: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  aliasAdd: {
    flexWrap: "nowrap",
    alignItems: "center",
  },
  aliasField: {
    flexGrow: 1,
    minInlineSize: 0,
  },
});
