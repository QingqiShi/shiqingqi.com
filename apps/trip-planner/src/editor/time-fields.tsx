"use client";

import { t } from "@tuja/i18n";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { TimeField } from "@tuja/ui/components/time-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { use, useId, useState } from "react";
import { momentMinutes } from "#src/reader/day-feed/moment-minutes.ts";
import { useTimeLabel } from "#src/reader/use-time-label.ts";
import { DAY_PARTS } from "#src/trips/day-parts.ts";
import type { DayPart, MomentTime } from "#src/trips/types.ts";
import { useEditor } from "./editor-provider.tsx";
import { SheetInputContext } from "./sheet-input-context.ts";
import { useDayLabels } from "./use-day-labels.ts";

type Part = DayPart | "backup";
const PARTS: readonly Part[] = [...DAY_PARTS, "backup"];

/**
 * The time of the sheet: one of three forms, with the value of each kept
 * while the person switches. A part of `""` is no part chosen yet.
 */
export interface TimeValue {
  mode: "clock" | "part" | "none";
  clock: string;
  part: Part | "";
}

/** Where the form of a new thing starts: the day and the time of the thing that the person added before it. */
export interface AddStart {
  dayId: string;
  time: TimeValue;
}

/** The clock time that a part of the day stands for in the order of the day, as `HH:MM`. */
function clockOfPart(part: DayPart) {
  const minutes = momentMinutes(part);
  const two = (value: number) => String(value).padStart(2, "0");
  return `${two(Math.floor(minutes / 60))}:${two(minutes % 60)}`;
}

/**
 * The part of the day that holds a clock time: the last part that starts at
 * or before it. A time before the first part is in the first part, so that
 * the thing keeps its place in the day.
 */
function partOfClock(clock: string): DayPart {
  const minutes = momentMinutes(clock);
  return (
    DAY_PARTS.findLast((part) => momentMinutes(part) <= minutes) ?? DAY_PARTS[0]
  );
}

/**
 * The value after the person switches to a form of the time. The new form
 * starts from what the old form said: a clock time gives the part of the day
 * that holds it, and a part gives the clock time that it stands for. A
 * backup plan has no clock time, so the clock starts empty.
 */
export function switchTimeMode(
  value: TimeValue,
  mode: TimeValue["mode"],
): TimeValue {
  if (mode === "part" && value.mode === "clock" && value.clock !== "") {
    return { ...value, mode, part: partOfClock(value.clock) };
  }
  if (mode === "clock" && value.mode === "part") {
    if (value.part === "" || value.part === "backup") {
      return { ...value, mode, clock: "" };
    }
    const keepsClock =
      value.clock !== "" && partOfClock(value.clock) === value.part;
    return keepsClock
      ? { ...value, mode }
      : { ...value, mode, clock: clockOfPart(value.part) };
  }
  return { ...value, mode };
}

export function timeValueOf(time: MomentTime | null): TimeValue {
  const part = PARTS.find((each) => each === time);
  if (time === null) return { mode: "none", clock: "", part: "" };
  if (part) return { mode: "part", clock: "", part };
  return { mode: "clock", clock: time, part: "" };
}

/** The time that the value stands for: null for no time, and undefined while the person has not set the clock or chosen the part. */
export function momentTimeOf(value: TimeValue): MomentTime | null | undefined {
  if (value.mode === "none") return null;
  if (value.mode === "part") return value.part === "" ? undefined : value.part;
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
  isMissing = false,
}: {
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  /** Whether the thing can have no time. A moment, and an item that lives only in a moment, cannot. */
  allowNone: boolean;
  /** Whether the person tried to save with no clock time set or no part chosen. */
  isMissing?: boolean;
}) {
  const timeLabel = useTimeLabel();
  const markInput = use(SheetInputContext);
  const labelId = useId();
  // The clock takes the focus when the person switches to it and it is
  // empty, so that the next thing to do is to set it.
  const [focusClock, setFocusClock] = useState(false);
  const clock = {
    value: "clock" as const,
    label: t({ en: "Clock", zh: "具体时间" }),
  };
  const part = {
    value: "part" as const,
    label: t({ en: "Part of day", zh: "时段" }),
  };
  const none = {
    value: "none" as const,
    label: t({ en: "None", zh: "不定时" }),
  };
  const partWithClock = t({
    en: "{part} · about {time}",
    zh: "{part} · 约 {time}",
  });
  const noClock = t({ en: "Set a time.", zh: "请选择时间。" });
  const noPart = t({ en: "Choose a part of the day.", zh: "请选择时段。" });
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
          const next = switchTimeMode(value, mode);
          setFocusClock(next.mode === "clock" && next.clock === "");
          markInput();
          onChange(next);
        }}
        options={allowNone ? [clock, part, none] : [clock, part]}
      />
      {value.mode === "clock" ? (
        <TimeField
          label={t({ en: "Clock time", zh: "具体时间" })}
          labelHidden
          autoFocus={focusClock}
          value={value.clock}
          error={isMissing && value.clock === "" ? noClock : undefined}
          onValueChange={(next) => {
            onChange({ ...value, clock: next });
          }}
        />
      ) : null}
      {value.mode === "part" ? (
        <Select
          label={t({ en: "Part of day", zh: "时段" })}
          labelHidden
          placeholder={t({ en: "Choose a part of the day", zh: "选择时段" })}
          value={value.part}
          error={isMissing && value.part === "" ? noPart : undefined}
          description={
            value.part === "backup"
              ? t({
                  en: "A backup plan has no time. It shows after the plan of the day.",
                  zh: "备选没有时间，排在当天安排之后。",
                })
              : undefined
          }
          onChange={(event) => {
            const next = PARTS.find((each) => each === event.target.value);
            if (next) onChange({ ...value, part: next });
          }}
        >
          {DAY_PARTS.map((each) => (
            <option key={each} value={each}>
              {partWithClock
                .replace("{part}", timeLabel(each))
                .replace("{time}", clockOfPart(each))}
            </option>
          ))}
          <optgroup
            label={t({ en: "Not in the day’s order", zh: "不排入当天顺序" })}
          >
            <option value="backup">{timeLabel("backup")}</option>
          </optgroup>
        </Select>
      ) : null}
    </div>
  );
}
