"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { useRef, useState } from "react";
import { t } from "#src/i18n.ts";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import type { TagRow } from "../sync/row-schemas.ts";
import { EditSheet } from "./edit-sheet.tsx";
import { nextPosition } from "./next-position.ts";
import { SettingsList } from "./settings-list.tsx";
import { SettingsPanel } from "./settings-panel.tsx";
import { SettingsRow } from "./settings-row.tsx";
import { useApplyMutations } from "./use-apply-mutations.ts";

/** The Tags: add, rename, delete. */
export function TagsSettings() {
  const tags = useReplica(liveRowSelectors.tags);
  const apply = useApplyMutations();
  const nameRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<TagRow | "new" | null>(null);
  const [name, setName] = useState("");
  const current = editing === "new" ? null : editing;

  function save() {
    const trimmed = name.trim();
    if (trimmed === "" || editing === null) return false;
    if (editing === "new") {
      const position = nextPosition(tags);
      return apply([
        {
          name: "upsertTag",
          args: { id: crypto.randomUUID(), name: trimmed, position },
        },
      ]);
    }
    return apply([
      { name: "upsertTag", args: { id: editing.id, name: trimmed } },
    ]);
  }

  return (
    <SettingsPanel
      title={t({ en: "Tags", zh: "标签" })}
      description={t({
        en: "Free labels across categories and payees, such as a trip or who a treat was for.",
        zh: "跨分类和商家的自由标签，例如一次旅行或请客对象。",
      })}
      actions={
        <Button
          size="sm"
          icon={<PlusIcon weight="bold" />}
          onClick={() => {
            setEditing("new");
            setName("");
          }}
        >
          {t({ en: "Tag", zh: "标签" })}
        </Button>
      }
    >
      {tags.length === 0 ? (
        <Text look="bodySmall" tone="muted">
          {t({ en: "No tags yet.", zh: "还没有标签。" })}
        </Text>
      ) : (
        <SettingsList>
          {tags.map((tag) => (
            <SettingsRow
              key={tag.id}
              title={tag.name}
              onClick={() => {
                setEditing(tag);
                setName(tag.name);
              }}
            />
          ))}
        </SettingsList>
      )}
      <EditSheet
        isOpen={editing !== null}
        onClose={() => {
          setEditing(null);
        }}
        title={
          editing === "new"
            ? t({ en: "New tag", zh: "新建标签" })
            : t({ en: "Edit tag", zh: "编辑标签" })
        }
        initialFocusRef={nameRef}
        onSave={save}
        danger={
          current
            ? {
                label: t({ en: "Delete", zh: "删除" }),
                onAction: () => {
                  apply([
                    {
                      name: "upsertTag",
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
      </EditSheet>
    </SettingsPanel>
  );
}
