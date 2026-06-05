import { z } from "zod";

// The payload the author-mode panel POSTs to /apply, which applies the edits
// straight to tokens.stylex.ts. Shared by the route, the browser client, and
// tests. `z.infer` provides the types — no hand-written interfaces, no assertions.

export const paletteSuggestionSchema = z.object({
  hue: z.string(),
  tone: z.number().int(),
  hex: z.string(),
  distance: z.number(),
});

// Scalar token values are validated per kind so a malformed edit can't reach the
// source editor — the panel guards too, but this is the wire backstop for any
// client that bypasses it:
//   • length  — a number with an optional CSS unit: "1.25rem", "-0.01em", "50%", "0"
//   • number  — a unitless decimal: "1.5", "0.95"
//   • integer — a whole number: "600", "-2"
// number/integer are spliced UNQUOTED into a `stylex.types.*()` wrapper, so they
// must be valid TS numeric literals: no unit (that's `length` only) and no
// leading zero (`007` / `01.5` is an octal/strict-mode error). length is written
// as a quoted string, so a unit is allowed and leading zeros are harmless.
// Empty/partial input ("", "1.", "rem") is rejected by every pattern.
const SCALAR_VALUE_PATTERNS = {
  length: /^-?(?:\d+(?:\.\d+)?|\.\d+)[a-z%]*$/i,
  number: /^-?(?:(?:0|[1-9]\d*)(?:\.\d+)?|\.\d+)$/,
  integer: /^-?(?:0|[1-9]\d*)$/,
};

export const colorEditSchema = z.object({
  kind: z.literal("color"),
  path: z.string().min(1),
  /** Colors are per-theme; the edit applies to whichever theme was active. */
  theme: z.enum(["light", "dark"]),
  /** Resolved color the user started from (rgb()/rgba()), for reference. */
  oldValue: z.string(),
  /** Resolved color the user picked. */
  newValue: z.string().min(1),
  /** Nearest palette tone, precomputed client-side to guide the apply. */
  paletteSuggestion: paletteSuggestionSchema.nullable().optional(),
});

export const scalarEditSchema = z
  .object({
    kind: z.enum(["length", "number", "integer"]),
    path: z.string().min(1),
    oldValue: z.string(),
    newValue: z.string().min(1),
  })
  .refine((edit) => SCALAR_VALUE_PATTERNS[edit.kind].test(edit.newValue), {
    message: "newValue does not match the scalar token kind",
    path: ["newValue"],
  });

export const editSchema = z.union([colorEditSchema, scalarEditSchema]);

export const changesetSchema = z.object({
  version: z.literal(1),
  createdAt: z.string(),
  edits: z.array(editSchema).min(1),
});

export type PaletteSuggestion = z.infer<typeof paletteSuggestionSchema>;
export type ColorEdit = z.infer<typeof colorEditSchema>;
export type ScalarEdit = z.infer<typeof scalarEditSchema>;
export type TokenEdit = z.infer<typeof editSchema>;
export type Changeset = z.infer<typeof changesetSchema>;
