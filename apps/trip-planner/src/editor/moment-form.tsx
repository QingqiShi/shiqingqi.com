"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { Textarea } from "@tuja/ui/components/textarea";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import type { DraftOp } from "#src/trips/ops/apply-ops.ts";
import { newId } from "#src/trips/ops/new-id.ts";
import type { Moment } from "#src/trips/types.ts";
import { useEditor } from "./editor-provider.tsx";
import { SheetActions } from "./sheet-actions.tsx";
import {
  DayField,
  momentTimeOf,
  TimeFields,
  timeValueOf,
} from "./time-fields.tsx";
import { useFormChange } from "./use-form-change.tsx";
import { usePlaceMessages } from "./use-place-messages.ts";

/** What the sheet edits: a moment of the trip, or a new note on a day. */
export type MomentFormTarget =
  { moment: Moment; dayId: string } | { dayId: string };

/**
 * The form of a moment: its words, its day and its time. A new moment is a
 * note, a line of the day with no item. A moment moves with all its items.
 */
export function MomentForm({
  target,
  onDone,
}: {
  target: MomentFormTarget;
  onDone: (rowId?: string) => void;
}) {
  const editor = useEditor();
  const messages = usePlaceMessages();
  const form = useFormChange(onDone);
  const moment = "moment" in target ? target.moment : null;
  const [text, setText] = useState(moment?.text ?? "");
  const [dayId, setDayId] = useState(target.dayId);
  const [time, setTime] = useState(() =>
    moment ? timeValueOf(moment.time) : timeValueOf(""),
  );
  const [errors, setErrors] = useState<{ text?: string; time?: string }>({});

  const noText = t({ en: "Write the note.", zh: "请填写内容。" });
  const noClock = t({ en: "Set a time.", zh: "请选择时间。" });
  const removedLabel = t({ en: "Removed", zh: "已移除" });
  const removeWithItems = t({
    en: "Remove with its items",
    zh: "连同其中的项目一起移除",
  });
  const remove = t({ en: "Remove", zh: "移除" });

  const submit = (ops: DraftOp[], message: string, rowId?: string) => {
    form.submit(ops, { message, dayId }, rowId);
  };

  const save = () => {
    const momentTime = momentTimeOf(time);
    const words = text.trim();
    const isEmpty =
      words === "" && !moment?.highlight && (moment?.items.length ?? 0) === 0;
    const nextErrors = {
      text: isEmpty ? noText : undefined,
      time: momentTime === undefined ? noClock : undefined,
    };
    setErrors(nextErrors);
    if (isEmpty || momentTime === undefined || momentTime === null) return;

    if (!moment) {
      // A note at a time that has only items becomes the words of that time.
      const wordless = editor.trip.days
        .find((day) => day.id === dayId)
        ?.moments.find((each) => each.time === momentTime && !each.text);
      if (wordless) {
        submit(
          [{ op: "setMoment", id: wordless.id, fields: { text: words } }],
          messages.added(dayId),
          wordless.id,
        );
        editor.reveal(wordless.id);
        return;
      }
      const id = newId();
      submit(
        [
          {
            op: "addMoment",
            dayId,
            moment: { id, time: momentTime, text: words },
          },
        ],
        messages.added(dayId),
        id,
      );
      editor.reveal(id);
      return;
    }
    const fields = {
      ...(words !== (moment.text ?? "") ? { text: words || null } : {}),
      ...(momentTime !== moment.time ? { time: momentTime } : {}),
    };
    const ops: DraftOp[] = [
      ...(Object.keys(fields).length > 0
        ? [{ op: "setMoment" as const, id: moment.id, fields }]
        : []),
      ...(dayId !== target.dayId
        ? [{ op: "moveMoment" as const, id: moment.id, dayId }]
        : []),
    ];
    submit(
      ops,
      messages.saved(
        { dayId: target.dayId, time: moment.time },
        { dayId, time: momentTime },
      ),
      moment.id,
    );
  };

  return (
    <form
      css={stack.item}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <Textarea
        label={t({ en: "Note", zh: "内容" })}
        autoFocus={!moment}
        rows={2}
        autoGrow
        value={text}
        error={errors.text}
        onChange={(event) => {
          setText(event.target.value);
        }}
      />
      <DayField value={dayId} onChange={setDayId} />
      <TimeFields
        value={time}
        onChange={setTime}
        allowNone={false}
        error={errors.time}
      />
      {moment && moment.items.length > 0 ? (
        <Text as="p" look="bodySmall" tone="muted">
          {t({
            en: "The items under this time move with it.",
            zh: "这个时间下的项目会一起移动。",
          })}
        </Text>
      ) : null}
      {form.problem}
      <SheetActions
        remove={
          moment ? (
            <Button
              type="button"
              look="ghost"
              intent="destructive"
              onClick={() => {
                submit([{ op: "removeMoment", id: moment.id }], removedLabel);
              }}
            >
              {moment.items.length > 0 ? removeWithItems : remove}
            </Button>
          ) : null
        }
      >
        <Button type="submit" look="primary" disabled={!editor.canEdit}>
          {moment
            ? t({ en: "Save", zh: "保存" })
            : t({ en: "Add", zh: "添加" })}
        </Button>
      </SheetActions>
    </form>
  );
}
