"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Select } from "@tuja/ui/components/select";
import { TextField } from "@tuja/ui/components/text-field";
import { useRef, useState } from "react";
import { t } from "#src/i18n.ts";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type { CategoryRow } from "../sync/row-schemas.ts";
import { categoryTree } from "./category-tree.ts";
import { EditSheet } from "./edit-sheet.tsx";
import { nextPosition } from "./next-position.ts";
import { SettingsList } from "./settings-list.tsx";
import { SettingsPanel } from "./settings-panel.tsx";
import { SettingsRow } from "./settings-row.tsx";
import { useApplyMutations } from "./use-apply-mutations.ts";

type Kind = CategoryRow["kind"];

interface Draft {
  id: string | null;
  name: string;
  emoji: string;
  parentId: string;
  archived: boolean;
}

/** The Category tree of each kind: add, rename, set an emoji, move under another parent, archive. */
export function CategoriesSettings() {
  const categories = useReplica(liveRowSelectors.categories);
  const apply = useApplyMutations();
  const nameRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<Kind>("expense");
  const [draft, setDraft] = useState<Draft | null>(null);
  const nodes = categoryTree(categories, kind);
  const archivedLabel = t({ en: "Archived", zh: "已归档" });
  const categorySaved = t({ en: "Category saved", zh: "分类已保存" });
  const displayName = useCategoryDisplayName();
  const builtInLabel = t({ en: "Built-in", zh: "内置" });

  const descendantsOf = (id: string) => {
    const found = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const category of categories) {
        if (
          category.parentId !== null &&
          found.has(category.parentId) &&
          !found.has(category.id)
        ) {
          found.add(category.id);
          grew = true;
        }
      }
    }
    return found;
  };
  const excluded = draft?.id ? descendantsOf(draft.id) : new Set<string>();
  const parentOptions = nodes.filter(
    (node) =>
      !excluded.has(node.category.id) && node.category.archivedAt === null,
  );

  function save() {
    if (!draft || draft.name.trim() === "") return false;
    const parentId = draft.parentId === "" ? null : draft.parentId;
    if (draft.id === null) {
      const position = nextPosition(
        categories.filter(
          (category) =>
            category.kind === kind && category.parentId === parentId,
        ),
      );
      return apply([
        {
          name: "upsertCategory",
          args: {
            id: crypto.randomUUID(),
            kind,
            name: draft.name.trim(),
            emoji: draft.emoji.trim(),
            parentId,
            position,
          },
        },
      ]);
    }
    return apply(
      [
        {
          name: "upsertCategory",
          args: {
            id: draft.id,
            name: draft.name.trim(),
            emoji: draft.emoji.trim(),
            parentId,
            archived: draft.archived,
          },
        },
      ],
      { message: categorySaved },
    );
  }

  return (
    <SettingsPanel
      title={t({ en: "Categories", zh: "分类" })}
      description={t({
        en: "What money is spent on or earned from. Archive a category to hide it from new transactions; its history stays.",
        zh: "钱花在哪里、从哪里来。归档后新交易中不再出现，历史保留。",
      })}
      actions={
        <Button
          size="sm"
          icon={<PlusIcon weight="bold" />}
          onClick={() => {
            setDraft({
              id: null,
              name: "",
              emoji: "",
              parentId: "",
              archived: false,
            });
          }}
        >
          {t({ en: "Category", zh: "分类" })}
        </Button>
      }
    >
      <div>
        <SegmentedControl
          aria-label={t({ en: "Kind", zh: "类型" })}
          options={[
            { value: "expense", label: t({ en: "Expense", zh: "支出" }) },
            { value: "income", label: t({ en: "Income", zh: "收入" }) },
          ]}
          value={kind}
          onChange={setKind}
        />
      </div>
      <SettingsList>
        {nodes.map(({ category, depth }) => (
          <SettingsRow
            key={category.id}
            depth={depth}
            title={`${category.emoji ? `${category.emoji} ` : ""}${displayName(category)}`}
            trailing={
              category.archivedAt !== null ? (
                <Badge size="sm" intent="neutral">
                  {archivedLabel}
                </Badge>
              ) : category.isSystem ? (
                <Badge size="sm" intent="neutral">
                  {builtInLabel}
                </Badge>
              ) : null
            }
            onClick={() => {
              setDraft({
                id: category.id,
                name: category.name,
                emoji: category.emoji,
                parentId: category.parentId ?? "",
                archived: category.archivedAt !== null,
              });
            }}
          />
        ))}
      </SettingsList>
      <EditSheet
        isOpen={draft !== null}
        onClose={() => {
          setDraft(null);
        }}
        title={
          draft?.id === null
            ? t({ en: "New category", zh: "新建分类" })
            : t({ en: "Edit category", zh: "编辑分类" })
        }
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
            <TextField
              label={t({ en: "Emoji", zh: "表情" })}
              maxLength={16}
              value={draft.emoji}
              onChange={(event) => {
                setDraft({ ...draft, emoji: event.target.value });
              }}
            />
            <Select
              label={t({ en: "Parent", zh: "上级分类" })}
              value={draft.parentId}
              options={[
                {
                  value: "",
                  label: t({ en: "None (top level)", zh: "无（一级分类）" }),
                },
                ...parentOptions.map(({ category, depth }) => ({
                  value: category.id,
                  label: `${"  ".repeat(depth)}${displayName(category)}`,
                })),
              ]}
              onChange={(event) => {
                setDraft({ ...draft, parentId: event.target.value });
              }}
            />
            {draft.id === null ? null : (
              <Checkbox
                label={t({ en: "Archived", zh: "已归档" })}
                description={t({
                  en: "Hidden when you pick a category; past transactions keep it.",
                  zh: "选择分类时不再显示；过去的交易保留此分类。",
                })}
                checked={draft.archived}
                onChange={(event) => {
                  setDraft({ ...draft, archived: event.target.checked });
                }}
              />
            )}
          </>
        ) : null}
      </EditSheet>
    </SettingsPanel>
  );
}
