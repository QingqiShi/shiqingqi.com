"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { TextField } from "@tuja/ui/components/text-field";
import { useRef, useState } from "react";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import type { AccountGroupRow } from "../sync/row-schemas.ts";
import { EditSheet } from "./edit-sheet.tsx";
import { nextPosition } from "./next-position.ts";
import { moveBy, reorderMutations } from "./reorder.ts";
import { SettingsPanel } from "./settings-panel.tsx";
import { useApplyMutations } from "./use-apply-mutations.ts";

type Side = AccountGroupRow["side"];

function moveGroup(
  groups: readonly AccountGroupRow[],
  id: string,
  direction: -1 | 1,
) {
  return reorderMutations(
    "upsertGroup",
    groups,
    moveBy(
      groups.map((group) => group.id),
      id,
      direction,
    ),
  );
}

/** The Groups of the balance sheet, in the Net worth order: add, rename, reorder, delete an empty one. */
export function GroupsSettings() {
  const locale = useLocale();
  const groups = useReplica(liveRowSelectors.accountGroups);
  const accounts = useReplica(liveRowSelectors.accounts);
  const apply = useApplyMutations();
  const nameRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<AccountGroupRow | "new" | null>(null);
  const [name, setName] = useState("");
  const [side, setSide] = useState<Side>("asset");
  const counts = new Map<string, number>();
  for (const account of accounts) {
    counts.set(account.groupId, (counts.get(account.groupId) ?? 0) + 1);
  }
  const sideLabels: Record<Side, string> = {
    asset: t({ en: "Assets", zh: "资产" }),
    liability: t({ en: "Liabilities", zh: "负债" }),
  };
  const accountsLabel = t({ en: "accounts", zh: "个账户" });
  const oneAccountLabel = t({ en: "1 account", zh: "1 个账户" });
  const upLabel = t({ en: "Move up:", zh: "上移：" });
  const downLabel = t({ en: "Move down:", zh: "下移：" });
  const current = editing === "new" || editing === null ? null : editing;
  const isEmpty = current === null || (counts.get(current.id) ?? 0) === 0;

  function save() {
    const trimmed = name.trim();
    if (trimmed === "") return false;
    if (editing === "new") {
      const position = nextPosition(groups);
      return apply([
        {
          name: "upsertGroup",
          args: { id: crypto.randomUUID(), name: trimmed, side, position },
        },
      ]);
    }
    if (current === null) return false;
    return apply([
      {
        name: "upsertGroup",
        args: { id: current.id, name: trimmed, ...(isEmpty ? { side } : {}) },
      },
    ]);
  }

  return (
    <SettingsPanel
      title={t({ en: "Groups", zh: "分组" })}
      description={t({
        en: "The sections of the balance sheet, in the order Net worth lists them. A group holds assets or liabilities, not both.",
        zh: "资产负债表中的分组，按净资产页的顺序排列。一个分组只能放资产或负债，不能混放。",
      })}
      actions={
        <Button
          size="sm"
          icon={<PlusIcon weight="bold" />}
          onClick={() => {
            setEditing("new");
            setName("");
            setSide("asset");
          }}
        >
          {t({ en: "Group", zh: "分组" })}
        </Button>
      }
    >
      <List>
        {groups.map((group, index) => (
          <ListRow
            key={group.id}
            detail={`${sideLabels[group.side]} · ${
              counts.get(group.id) === 1
                ? oneAccountLabel
                : `${new Intl.NumberFormat(locale).format(counts.get(group.id) ?? 0)} ${accountsLabel}`
            }`}
            onClick={() => {
              setEditing(group);
              setName(group.name);
              setSide(group.side);
            }}
            actions={
              <>
                <Button
                  size="sm"
                  look="ghost"
                  icon={<ArrowUpIcon weight="bold" />}
                  aria-label={`${upLabel} ${group.name}`}
                  disabled={index === 0}
                  onClick={() => {
                    apply(moveGroup(groups, group.id, -1));
                  }}
                />
                <Button
                  size="sm"
                  look="ghost"
                  icon={<ArrowDownIcon weight="bold" />}
                  aria-label={`${downLabel} ${group.name}`}
                  disabled={index === groups.length - 1}
                  onClick={() => {
                    apply(moveGroup(groups, group.id, 1));
                  }}
                />
              </>
            }
          >
            {group.name}
          </ListRow>
        ))}
      </List>
      <EditSheet
        isOpen={editing !== null}
        onClose={() => {
          setEditing(null);
        }}
        title={
          editing === "new"
            ? t({ en: "New group", zh: "新建分组" })
            : t({ en: "Edit group", zh: "编辑分组" })
        }
        initialFocusRef={nameRef}
        onSave={save}
        danger={
          current !== null && isEmpty
            ? {
                label: t({ en: "Delete", zh: "删除" }),
                onAction: () => {
                  apply([
                    {
                      name: "upsertGroup",
                      args: { id: current.id, deleted: true },
                    },
                  ]);
                },
              }
            : undefined
        }
      >
        <TextField
          ref={nameRef}
          label={t({ en: "Name", zh: "名称" })}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        {isEmpty ? (
          <SegmentedControl
            aria-label={t({ en: "Side", zh: "资产或负债" })}
            options={[
              { value: "asset", label: sideLabels.asset },
              { value: "liability", label: sideLabels.liability },
            ]}
            value={side}
            onChange={setSide}
          />
        ) : null}
      </EditSheet>
    </SettingsPanel>
  );
}
