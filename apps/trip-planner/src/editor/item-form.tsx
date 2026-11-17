"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import type { DraftOp } from "#src/trips/ops/apply-ops.ts";
import { newId } from "#src/trips/ops/new-id.ts";
import type { MomentTime } from "#src/trips/types.ts";
import {
  itemName,
  LIST_OF_KIND,
  slotOf,
  type LocatedItem,
} from "./build-outline.ts";
import { useEditor } from "./editor-provider.tsx";
import {
  formOf,
  isFormKind,
  isLink,
  ITEM_FIELDS,
  newItemOf,
  patchOf,
  type FieldSpec,
  type FormKind,
  type FormValues,
} from "./item-fields.ts";
import { addItemOps, moveItemOps } from "./move-item-ops.ts";
import { AddAnotherButton, SheetActions } from "./sheet-actions.tsx";
import {
  DayField,
  momentTimeOf,
  TimeFields,
  timeValueOf,
  type AddStart,
  type TimeValue,
} from "./time-fields.tsx";
import {
  useFieldLabels,
  useKindLabels,
  useOptionLabels,
} from "./use-field-labels.ts";
import { useFormChange } from "./use-form-change.tsx";
import { usePlaceMessages } from "./use-place-messages.ts";

/** The keypad that a phone shows for a field. */
const INPUT_MODES: Partial<
  Record<FieldSpec["input"], "url" | "tel" | "numeric">
> = { url: "url", phone: "tel", count: "numeric" };

function Field({
  spec,
  label,
  value,
  error,
  autoFocus,
  onChange,
}: {
  spec: FieldSpec;
  label: string;
  value: string;
  error?: string;
  autoFocus: boolean;
  onChange: (value: string) => void;
}) {
  const optionLabels = useOptionLabels();
  if (spec.input === "select") {
    return (
      <Select
        label={label}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        options={(spec.options ?? []).map((option) => ({
          value: option,
          label: optionLabels[option] ?? option,
        }))}
      />
    );
  }
  if (spec.input === "textarea") {
    return (
      <Textarea
        label={label}
        rows={2}
        autoGrow
        autoFocus={autoFocus}
        value={value}
        error={error}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    );
  }
  return (
    <TextField
      label={label}
      value={value}
      error={error}
      autoFocus={autoFocus}
      autoComplete="off"
      type={
        spec.input === "url" ? "url" : spec.input === "phone" ? "tel" : "text"
      }
      inputMode={INPUT_MODES[spec.input]}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}

/** What the sheet edits: an item of the trip, or a new item of a kind on a day. */
export type ItemFormTarget =
  { found: LocatedItem } | { kind: FormKind; dayId: string; time?: TimeValue };

/**
 * The form of one item, for a change and for an add: its name, its day, its
 * time, its note, and the fields that few people fill. An item of a kind
 * with no form shows only its day and its time. Save and Remove each make
 * one change.
 */
export function ItemForm({
  target,
  onDone,
  onAnother,
}: {
  target: ItemFormTarget;
  /** Closes the sheet. With an id, the sheet goes back into the row of that thing. */
  onDone: (rowId?: string) => void;
  /** Starts the form of one more new item, at the day and the time of the item that the person added. */
  onAnother?: (start: AddStart) => void;
}) {
  const editor = useEditor();
  const fieldLabels = useFieldLabels();
  const kindLabels = useKindLabels();
  const messages = usePlaceMessages();
  const form = useFormChange(onDone);
  const found = "found" in target ? target.found : null;
  const kind = "found" in target ? target.found.item.type : target.kind;
  const formKind = isFormKind(kind) ? kind : null;
  const start =
    "found" in target
      ? slotOf(target.found)
      : { dayId: target.dayId, time: null };

  const [values, setValues] = useState<FormValues>(() =>
    formKind ? formOf(formKind, found?.item) : {},
  );
  const [dayId, setDayId] = useState(start.dayId);
  const [time, setTime] = useState(
    () => ("time" in target ? target.time : null) ?? timeValueOf(start.time),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTimeMissing, setIsTimeMissing] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const specs = formKind ? ITEM_FIELDS[formKind] : [];

  const required = t({ en: "Give it a name.", zh: "请填写名称。" });
  const badLink = t({
    en: "A link starts with https://",
    zh: "链接应以 https:// 开头",
  });
  const invalid = t({
    en: "This cannot be added as it is. Check what you entered.",
    zh: "这样无法添加，请检查填写的内容。",
  });
  const removed = t({ en: "Removed “{name}”", zh: "已移除“{name}”" });

  const save = (another = false) => {
    const nextErrors: Record<string, string> = {};
    for (const spec of specs) {
      const value = (values[spec.key] ?? "").trim();
      if (spec.required && value === "") nextErrors[spec.key] = required;
      if (spec.input === "url" && value !== "" && !isLink(value)) {
        nextErrors[spec.key] = badLink;
      }
    }
    const momentTime: MomentTime | null | undefined =
      kind === "lodging" ? null : momentTimeOf(time);
    setErrors(nextErrors);
    setIsTimeMissing(momentTime === undefined);
    if (specs.some((spec) => spec.group === "more" && nextErrors[spec.key])) {
      setIsMoreOpen(true);
    }
    if (Object.keys(nextErrors).length > 0 || momentTime === undefined) return;
    const slot = { dayId, time: momentTime };

    if (!found) {
      const id = newId();
      const item = formKind ? newItemOf(formKind, id, values) : null;
      if (!item) {
        form.setProblem(invalid);
        return;
      }
      const isAdded = form.submit(
        addItemOps(editor.trip, item, slot, newId),
        { message: messages.added(dayId), dayId },
        id,
        another,
      );
      if (!isAdded) return;
      editor.reveal(id);
      if (another) onAnother?.({ dayId, time });
      return;
    }
    const patch = formKind ? patchOf(formKind, found.item, values) : {};
    const moves = moveItemOps(editor.trip, found.item.id, slot, newId);
    const ops: DraftOp[] = [
      ...(Object.keys(patch).length > 0
        ? [{ op: "setItem" as const, id: found.item.id, fields: patch }]
        : []),
      ...moves,
    ];
    const isSaved = form.submit(
      ops,
      { message: messages.saved(start, slot, LIST_OF_KIND[kind]), dayId },
      found.item.id,
    );
    if (isSaved && moves.length > 0) editor.reveal(found.item.id);
  };

  const field = (spec: FieldSpec) => (
    <Field
      key={spec.key}
      spec={spec}
      autoFocus={!found && spec === specs[0]}
      label={formKind ? (fieldLabels[formKind][spec.key] ?? spec.key) : ""}
      value={values[spec.key] ?? ""}
      error={errors[spec.key]}
      onChange={(value) => {
        setValues((current) => ({ ...current, [spec.key]: value }));
      }}
    />
  );
  const mainFields = specs.filter((spec) => spec.group === "main");
  const moreFields = specs.filter((spec) => spec.group === "more");

  return (
    <form
      css={stack.item}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      {found && !formKind ? (
        <Text as="p" tone="muted">
          {t({
            en: "You can move or remove this {kind}. Its content cannot be changed in the editor yet.",
            zh: "可以移动或移除这个{kind}，暂时还不能在编辑器里修改它的内容。",
          }).replace("{kind}", kindLabels[kind].toLowerCase())}
        </Text>
      ) : null}
      {mainFields.slice(0, 1).map(field)}
      <DayField value={dayId} onChange={setDayId} />
      {kind === "lodging" ? null : (
        <TimeFields
          value={time}
          onChange={setTime}
          allowNone={LIST_OF_KIND[kind] !== undefined}
          isMissing={isTimeMissing}
        />
      )}
      {mainFields.slice(1).map(field)}
      {moreFields.length > 0 ? (
        <Disclosure
          summary={
            kind === "place"
              ? t({ en: "More details", zh: "更多信息" })
              : t({ en: "Booking and details", zh: "预订与详情" })
          }
          open={isMoreOpen}
          onOpenChange={setIsMoreOpen}
        >
          <div css={stack.item}>{moreFields.map(field)}</div>
        </Disclosure>
      ) : null}
      {form.problem}
      <SheetActions
        remove={
          found ? (
            <Button
              type="button"
              look="outline"
              intent="destructive"
              onClick={() => {
                form.submit([{ op: "removeItem", id: found.item.id }], {
                  message: removed.replace("{name}", itemName(found.item)),
                  dayId,
                });
              }}
            >
              {t({ en: "Remove", zh: "移除" })}
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
          {found ? t({ en: "Save", zh: "保存" }) : t({ en: "Add", zh: "添加" })}
        </Button>
      </SheetActions>
    </form>
  );
}
