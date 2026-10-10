"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { Chip } from "@tuja/ui/components/chip";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useId, useState } from "react";
import { t } from "#src/i18n.ts";
import type { TagRow } from "../sync/row-schemas.ts";
import { Combobox } from "./combobox.tsx";
import { FieldLabel } from "./field-label.tsx";
import { normalisePayeeText } from "./rank-payees.ts";

interface TagPickerProps {
  tags: readonly TagRow[];
  value: readonly string[];
  onChange: (tagIds: string[]) => void;
  /** Makes a new Tag and returns its id. */
  onCreate: (name: string) => string;
  fromLastTime: boolean;
}

/** Tags as removable chips, and a field with typeahead to add one or make a new one. */
export function TagPicker({
  tags,
  value,
  onChange,
  onCreate,
  fromLastTime,
}: TagPickerProps) {
  const labelId = useId();
  const [text, setText] = useState("");
  const chosen = new Set(value);
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const query = normalisePayeeText(text);
  const options = tags
    .filter(
      (tag) =>
        !chosen.has(tag.id) &&
        (query === "" || normalisePayeeText(tag.name).includes(query)),
    )
    .sort((a, b) => {
      const prefixA = normalisePayeeText(a.name).startsWith(query) ? 0 : 1;
      const prefixB = normalisePayeeText(b.name).startsWith(query) ? 0 : 1;
      return prefixA - prefixB;
    })
    .slice(0, 8)
    .map((tag) => ({ id: tag.id, label: tag.name }));
  const removeLabel = t({ en: "Remove", zh: "移除" });
  const newTagLabel = t({ en: "New tag", zh: "新标签" });

  return (
    <div role="group" aria-labelledby={labelId} css={stack.tight}>
      <FieldLabel id={labelId} fromLastTime={fromLastTime}>
        {t({ en: "Tags", zh: "标签" })}
      </FieldLabel>
      {value.length > 0 ? (
        <div css={cluster.tight}>
          {value.map((tagId) => (
            <Chip
              key={tagId}
              size="sm"
              aria-label={`${removeLabel} ${byId.get(tagId)?.name ?? ""}`}
              trailing={<XIcon weight="bold" aria-hidden />}
              onClick={() => {
                onChange(value.filter((id) => id !== tagId));
              }}
            >
              {byId.get(tagId)?.name ?? "…"}
            </Chip>
          ))}
        </div>
      ) : null}
      <Combobox
        label={t({ en: "Add a tag", zh: "添加标签" })}
        labelHidden
        placeholder={t({ en: "Add a tag", zh: "添加标签" })}
        value={text}
        onValueChange={setText}
        options={options}
        onSelect={(option) => {
          onChange([...value, option.id]);
          setText("");
        }}
        createLabel={(name) => `${newTagLabel} “${name}”`}
        onCreate={(name) => {
          const existing = tags.find(
            (tag) => normalisePayeeText(tag.name) === normalisePayeeText(name),
          );
          const id = existing?.id ?? onCreate(name);
          if (!chosen.has(id)) onChange([...value, id]);
          setText("");
        }}
      />
    </div>
  );
}
