"use client";

import { t } from "@tuja/i18n";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { TimeField } from "@tuja/ui/components/time-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useId } from "react";
import { useTimeLabel } from "#src/reader/use-time-label.ts";
import { DAY_PARTS } from "#src/trips/day-parts.ts";
import type { MomentTime } from "#src/trips/types.ts";
import { useEditor } from "./editor-provider.tsx";
import { useDayLabels } from "./use-day-labels.ts";

type Part = (typeof DAY_PARTS)[number] | "backup";
const PARTS: readonly Part[] = [...DAY_PARTS, "backup"];

/** The time of the sheet: one of three forms, with the value of each kept while the person switches. */
export interface TimeValue {
  mode: "clock" | "part" | "none";
  clock: string;
  part: Part;
}

export function timeValueOf(time: MomentTime | null): TimeValue {
  const part = PARTS.find((each) => each === time);
  if (time === null) return { mode: "none", clock: "", part: "morning" };
  if (part) return { mode: "part", clock: "", part };
  return { mode: "clock", clock: time, part: "morning" };
}

/** The time that the value stands for: null for no time, and undefined while the clock has no whole time. */
export function momentTimeOf(value: TimeValue): MomentTime | null | undefined {
  if (value.mode === "none") return null;
  if (value.mode === "part") return value.part;
  return value.clock === "" ? undefined : value.clock;
}

/** The day of an item or a moment. A change of it moves the thing to that day. */
export function DayField({
  value,
  onChange,
}: {
  value: string;
  onChange: (dayId: string) => void;
}) {
  const { trip } = useEditor();
  const dayLabels = useDayLabels();
  return (
    <Select
      label={t({ en: "Day", zh: "日期" })}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      options={trip.days.map((day, index) => ({
        value: day.id,
        label: day.title
          ? `${dayLabels.dated(day, index)} · ${day.title}`
          : dayLabels.dated(day, index),
      }))}
    />
  );
}

/** The time of an item or a moment: a clock time, a part of the day, or none where the thing can be without one. */
export function TimeFields({
  value,
  onChange,
  allowNone,
  error,
}: {
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  /** Whether the thing can have no time. A moment, and an item that lives only in a moment, cannot. */
  allowNone: boolean;
  error?: string;
}) {
  const timeLabel = useTimeLabel();
  const labelId = useId();
  const clock = {
    value: "clock" as const,
    label: t({ en: "Clock", zh: "钟点" }),
  };
  const part = {
    value: "part" as const,
    label: t({ en: "Part of day", zh: "时段" }),
  };
  const none = { value: "none" as const, label: t({ en: "None", zh: "不定" }) };
  return (
    <div css={stack.tight}>
      <Text id={labelId} look="label" weight="semibold">
        {t({ en: "Time", zh: "时间" })}
      </Text>
      <SegmentedControl<TimeValue["mode"]>
        aria-labelledby={labelId}
        fullWidth
        value={value.mode}
        onChange={(mode) => {
          onChange({ ...value, mode });
        }}
        options={allowNone ? [clock, part, none] : [clock, part]}
      />
      {value.mode === "clock" ? (
        <TimeField
          label={t({ en: "Clock time", zh: "钟点" })}
          labelHidden
          value={value.clock}
          error={error}
          onValueChange={(next) => {
            onChange({ ...value, clock: next });
          }}
        />
      ) : null}
      {value.mode === "part" ? (
        <Select
          label={t({ en: "Part of day", zh: "时段" })}
          labelHidden
          value={value.part}
          onChange={(event) => {
            const next = PARTS.find((each) => each === event.target.value);
            if (next) onChange({ ...value, part: next });
          }}
          options={PARTS.map((each) => ({
            value: each,
            label: timeLabel(each),
          }))}
        />
      ) : null}
    </div>
  );
}
