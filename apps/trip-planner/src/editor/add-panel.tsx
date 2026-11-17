"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { NoteIcon } from "@phosphor-icons/react/dist/ssr/Note";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { FORM_KINDS, type FormKind } from "./item-fields.ts";
import { ItemForm } from "./item-form.tsx";
import { KindIcon } from "./item-row.tsx";
import { MomentForm } from "./moment-form.tsx";
import { useKindLabels } from "./use-field-labels.ts";

/** What a person adds to a day: an item of a kind that has a form, or a note, which is a moment with only words. */
export function AddPanel({
  dayId,
  onDone,
}: {
  dayId: string;
  onDone: (rowId?: string) => void;
}) {
  const kindLabels = useKindLabels();
  const [kind, setKind] = useState<FormKind | "note" | null>(null);
  const noteLabel = t({ en: "Note", zh: "备注" });
  const details: Record<FormKind | "note", string> = {
    dining: t({ en: "A place to eat", zh: "吃饭的地方" }),
    place: t({ en: "A place to go or to see", zh: "要去或要看的地方" }),
    lodging: t({ en: "Where you sleep that night", zh: "当晚住的地方" }),
    tip: t({ en: "A thing to know that day", zh: "当天要知道的事" }),
    note: t({
      en: "A line of the plan, such as “Check out”",
      zh: "一行安排，例如“退房”",
    }),
  };

  if (kind === null) {
    return (
      <List aria-label={t({ en: "Kind", zh: "类型" })}>
        {FORM_KINDS.map((each) => (
          <ListRow
            key={each}
            leading={<KindIcon kind={each} />}
            leadingSize="sm"
            wrap
            detail={details[each]}
            onClick={() => {
              setKind(each);
            }}
          >
            {kindLabels[each]}
          </ListRow>
        ))}
        <ListRow
          leading={<NoteIcon weight="bold" />}
          leadingSize="sm"
          wrap
          detail={details.note}
          onClick={() => {
            setKind("note");
          }}
        >
          {noteLabel}
        </ListRow>
      </List>
    );
  }

  return (
    <div css={stack.item}>
      <div>
        <Button
          look="ghost"
          size="sm"
          bleed="start"
          icon={<CaretLeftIcon weight="bold" />}
          onClick={() => {
            setKind(null);
          }}
        >
          {kind === "note" ? noteLabel : kindLabels[kind]}
        </Button>
      </div>
      {kind === "note" ? (
        <MomentForm target={{ dayId }} onDone={onDone} />
      ) : (
        <ItemForm target={{ kind, dayId }} onDone={onDone} />
      )}
    </div>
  );
}
