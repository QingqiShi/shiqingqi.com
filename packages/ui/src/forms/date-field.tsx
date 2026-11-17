"use client";

import { TemporalField, type TemporalFieldProps } from "./temporal-field.tsx";

interface DateFieldProps extends TemporalFieldProps {
  /**
   * The day, as `YYYY-MM-DD`, or `""` for no day. Pass it with
   * `onValueChange` to control the field.
   *
   * @zh 日期，格式为 `YYYY-MM-DD`；没有日期时为 `""`。与 `onValueChange` 一起传入即为受控字段。
   */
  value?: string;
  /**
   * The first day of an uncontrolled field, as `YYYY-MM-DD`.
   *
   * @zh 非受控字段的初始日期，格式为 `YYYY-MM-DD`。
   */
  defaultValue?: string;
  /**
   * Called with a whole day as `YYYY-MM-DD`, or with `""` when the visitor
   * clears the field. A day that the visitor has only half typed is not
   * reported, and stays on the screen until it is whole.
   *
   * @zh 以 `YYYY-MM-DD` 传入完整的日期；访客清空字段时传入 `""`。只输入了一半的日期不会被报告，并会留在屏幕上直到输入完整。
   */
  onValueChange?: (value: string) => void;
  /**
   * The earliest day the visitor can pick, as `YYYY-MM-DD`.
   *
   * @zh 可选的最早日期，格式为 `YYYY-MM-DD`。
   */
  min?: string;
  /**
   * The latest day the visitor can pick, as `YYYY-MM-DD`. Defaults to the
   * last day of the year 9999, so that a year has four figures.
   *
   * @zh 可选的最晚日期，格式为 `YYYY-MM-DD`。默认为 9999 年的最后一天，使年份为四位数。
   */
  max?: string;
}

/**
 * A field for a day, in the frame of a `TextField`. It is the native date
 * input, so a phone opens its own date picker, and the keyboard types each
 * part of the day. The day shows in the format of the visitor's device.
 */
export function DateField(props: DateFieldProps) {
  return <TemporalField {...props} kind="date" />;
}
