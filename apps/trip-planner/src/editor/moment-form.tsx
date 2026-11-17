"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import type { DraftOp } from "#src/trips/ops/apply-ops.ts";
import { newId } from "#src/trips/ops/new-id.ts";
import type { Moment } from "#src/trips/types.ts";
import { useEditor } from "./editor-provider.tsx";
import { AddAnotherButton, SheetActions } from "./sheet-actions.tsx";
import {
  DayField,
  momentTimeOf,
  TimeFields,
  timeValueOf,
  type AddStart,
  type TimeValue,
} from "./time-fields.tsx";
import { useFormChange } from "./use-form-change.tsx";
import { usePlaceMessages } from "./use-place-messages.ts";

/** What the sheet edits: a moment of the trip, or a new note on a day. */
export type MomentFormTarget =
  { moment: Moment; dayId: string } | { dayId: string; time?: TimeValue };

/**
 * The form of a moment: its words, its day and its time. A new moment is a
 * note, a line of the day with no item. A moment that the day shows at a
 * glance has a short name for that, and the form changes it too. A moment
 * moves with all its items.
 */
export function MomentForm({
  target,
  onDone,
  onAnother,
}: {
  target: MomentFormTarget;
  onDone: (rowId?: string) => void;
  /** Starts the form of one more new note, at the day and the time of the note that the person added. */
  onAnother?: (start: AddStart) => void;
}) {
  const editor = useEditor();
  const messages = usePlaceMessages();
  const form = useFormChange(onDone);
  const moment = "moment" in target ? target.moment : null;
  const [text, setText] = useState(moment?.text ?? "");
  const highlight = moment?.highlight ?? null;
  const [label, setLabel] = useState(highlight?.label ?? "");
  const [dayId, setDayId] = useState(target.dayId);
  const [time, setTime] = useState(
    () =>
      ("time" in target ? target.time : null) ??
      timeValueOf(moment ? moment.time : ""),
  );
  const [errors, setErrors] = useState<{ text?: string; label?: string }>({});
  const [isTimeMissing, setIsTimeMissing] = useState(false);

  const noText = t({ en: "Write the note.", zh: "请填写内容。" });
  const noLabel = t({ en: "Give it a short name.", zh: "请填写名称。" });
  const removedLabel = t({ en: "Removed", zh: "已移除" });
  const removeWithItems = t({
    en: "Remove with its items",
    zh: "连同其中的项目一起移除",
  });
  const remove = t({ en: "Remove", zh: "移除" });

  const submit = (
    ops: DraftOp[],
    message: string,
    rowId?: string,
    keepOpen = false,
  ) => form.submit(ops, { message, dayId }, rowId, keepOpen);

  const save = (another = false) => {
    const momentTime = momentTimeOf(time);
    const words = text.trim();
    const isEmpty =
      words === "" && !moment?.highlight && (moment?.items.length ?? 0) === 0;
    const name = label.trim();
    const hasNoLabel = highlight !== null && name === "";
    setErrors({
      text: isEmpty ? noText : undefined,
      label: hasNoLabel ? noLabel : undefined,
    });
    setIsTimeMissing(momentTime === undefined);
    if (isEmpty || hasNoLabel) return;
    if (momentTime === undefined || momentTime === null) return;

    if (!moment) {
      // A note at a time that has only items becomes the words of that time.
      const wordless = editor.trip.days
        .find((day) => day.id === dayId)
        ?.moments.find((each) => each.time === momentTime && !each.text);
      const id = wordless?.id ?? newId();
      const isAdded = submit(
        wordless
          ? [{ op: "setMoment", id, fields: { text: words } }]
          : [
              {
                op: "addMoment",
                dayId,
                moment: { id, time: momentTime, text: words },
              },
            ],
        messages.added(dayId),
        id,
        another,
      );
      if (!isAdded) return;
      editor.reveal(id);
      if (another) onAnother?.({ dayId, time });
      return;
    }
    const fields = {
      ...(words !== (moment.text ?? "") ? { text: words || null } : {}),
      ...(momentTime !== moment.time ? { time: momentTime } : {}),
      ...(highlight && name !== highlight.label
        ? { highlight: { ...highlight, label: name } }
        : {}),
    };
    const ops: DraftOp[] = [
      ...(Object.keys(fields).length > 0
        ? [{ op: "setMoment" as const, id: moment.id, fields }]
        : []),
      ...(dayId !== target.dayId
        ? [{ op: "moveMoment" as const, id: moment.id, dayId }]
        : []),
    ];
    const isSaved = submit(
      ops,
      messages.saved(
        { dayId: target.dayId, time: moment.time },
        { dayId, time: momentTime },
      ),
      moment.id,
    );
    if (isSaved && (dayId !== target.dayId || momentTime !== moment.time)) {
      editor.reveal(moment.id);
    }
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
      {highlight ? (
        <TextField
          label={t({ en: "Short name", zh: "名称" })}
          description={t({
            en: "The day shows it under “At a glance”, and on this line of the plan.",
            zh: "显示在当天的“今日要点”里，也是这一行安排的名称。",
          })}
          autoComplete="off"
          value={label}
          error={errors.label}
          onChange={(event) => {
            setLabel(event.target.value);
          }}
        />
      ) : null}
      <Textarea
        label={
          highlight
            ? t({ en: "Note", zh: "备注" })
            : t({ en: "Note", zh: "内容" })
        }
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
        isMissing={isTimeMissing}
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
              look="outline"
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
        {onAnother ? (
          <AddAnotherButton
            onClick={() => {
              save(true);
            }}
          />
        ) : null}
        <Button type="submit" look="primary" disabled={!editor.canEdit}>
          {moment
            ? t({ en: "Save", zh: "保存" })
            : t({ en: "Add", zh: "添加" })}
        </Button>
      </SheetActions>
    </form>
  );
}
