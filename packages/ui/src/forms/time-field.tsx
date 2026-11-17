"use client";

import { TemporalField, type TemporalFieldProps } from "./temporal-field.tsx";

interface TimeFieldProps extends TemporalFieldProps {
  /**
   * The time of day, as `HH:MM` on the 24-hour clock, or `""` for no time.
   * Pass it with `onValueChange` to control the field.
   *
   * @zh 一天中的时刻，格式为 24 小时制的 `HH:MM`；没有时刻时为 `""`。与 `onValueChange` 一起传入即为受控字段。
   */
  value?: string;
  /**
   * The first time of an uncontrolled field, as `HH:MM`.
   *
   * @zh 非受控字段的初始时刻，格式为 `HH:MM`。
   */
  defaultValue?: string;
  /**
   * Called with a whole time as `HH:MM`, or with `""` when the visitor
   * clears the field. A time that the visitor has only half typed is not
   * reported, and stays on the screen until it is whole.
   *
   * @zh 以 `HH:MM` 传入完整的时刻；访客清空字段时传入 `""`。只输入了一半的时刻不会被报告，并会留在屏幕上直到输入完整。
   */
  onValueChange?: (value: string) => void;
  /**
   * The earliest time the visitor can pick, as `HH:MM`.
   *
   * @zh 可选的最早时刻，格式为 `HH:MM`。
   */
  min?: string;
  /**
   * The latest time the visitor can pick, as `HH:MM`.
   *
   * @zh 可选的最晚时刻，格式为 `HH:MM`。
   */
  max?: string;
}

/**
 * A field for a time of day, in hours and minutes, in the frame of a
 * `TextField`. It is the native time input, so a phone opens its own time
 * picker, and the keyboard types each part of the time. The time shows on
 * the 12-hour or the 24-hour clock of the visitor's device; the value is
 * always on the 24-hour clock.
 */
export function TimeField(props: TimeFieldProps) {
  return <TemporalField {...props} kind="time" />;
}
