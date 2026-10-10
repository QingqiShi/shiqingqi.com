"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRef, useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import type { AccountGroupRow } from "../sync/row-schemas.ts";
import { EditSheet } from "./edit-sheet.tsx";
import { nextPosition } from "./next-position.ts";
import { reorder } from "./reorder.ts";
import { SettingsList } from "./settings-list.tsx";
import { SettingsPanel } from "./settings-panel.tsx";
import { SettingsRow } from "./settings-row.tsx";
import { useApplyMutations } from "./use-apply-mutations.ts";

type Side = AccountGroupRow["side"];

const SIDES: readonly Side[] = ["asset", "liability"];

function moveGroup(
  rows: readonly AccountGroupRow[],
  id: string,
  direction: -1 | 1,
) {
  return reorder(rows, id, direction).map((change): LocalMutationInput => ({
    name: "upsertGroup",
    args: change,
  }));
}

/** The Groups of the balance sheet, by side: add, rename, reorder, delete an empty one. */
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
        en: "The sections of the balance sheet. A group holds assets or liabilities, not both.",
        zh: "资产负债表中的分组。一个分组只能放资产或负债，不能混放。",
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
      {SIDES.map((groupSide) => {
        const rows = groups.filter((group) => group.side === groupSide);
        return (
          <div key={groupSide} css={stack.tight}>
            <Heading level={3} look="h4">
              {sideLabels[groupSide]}
            </Heading>
            <SettingsList>
              {rows.map((group, index) => (
                <SettingsRow
                  key={group.id}
                  title={group.name}
                  detail={
                    counts.get(group.id) === 1
                      ? oneAccountLabel
                      : `${new Intl.NumberFormat(locale).format(counts.get(group.id) ?? 0)} ${accountsLabel}`
                  }
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
                          apply(moveGroup(rows, group.id, -1));
                        }}
                      />
                      <Button
                        size="sm"
                        look="ghost"
                        icon={<ArrowDownIcon weight="bold" />}
                        aria-label={`${downLabel} ${group.name}`}
                        disabled={index === rows.length - 1}
                        onClick={() => {
                          apply(moveGroup(rows, group.id, 1));
                        }}
                      />
                    </>
                  }
                />
              ))}
            </SettingsList>
          </div>
        );
      })}
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
