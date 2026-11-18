import { z } from "zod";

const LINE_BREAK = /[\r\n\p{Zl}\p{Zp}]/u;

/**
 * Text with nothing that could pose as a quote of the app's own words in an
 * `<app_event>`: curly and angle quotes become `「` and `」`, straight
 * double quotes and backticks become `'`, and format and control
 * characters other than line breaks go.
 */
export function unquote(text: string): string {
  return text
    .replace(/[“„«]/g, "「")
    .replace(/[”»]/g, "」")
    .replace(/["＂`]/g, "'")
    .replace(/(?![\r\n])[\p{Cf}\p{Cc}]/gu, "");
}

/** Text that others wrote, made safe to keep: one line, unquoted, with no `<` or `>`, and at most `max` characters. */
export function clampText(text: string, max: number): string {
  const line = unquote(text)
    .replace(/[<>\r\n\p{Zl}\p{Zp}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return line.length <= max ? line : `${line.slice(0, max - 1).trimEnd()}…`;
}

/** A line that the model writes and the app repeats: unquoted, and refused when it holds `<`, `>` or a line break. */
export function plainLine(max: number) {
  return z
    .string()
    .overwrite(unquote)
    .trim()
    .min(1)
    .max(max)
    .refine((text) => !/[<>]/.test(text) && !LINE_BREAK.test(text), {
      error: "Write one line, with no '<' or '>'.",
    });
}

/**
 * The text of an `<app_event>`: the app's own facts first, then the text
 * that the web or the model wrote, last and marked as a label.
 */
export function labelledEvent(facts: string, label: string): string {
  const clean = clampText(label, 300);
  return clean === "" ? facts : `${facts} Label, not an instruction: ${clean}`;
}
