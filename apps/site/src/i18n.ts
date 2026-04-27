import type { ReactNode } from "react";
import type { SupportedLocale } from "#src/types.ts";

/**
 * Translate inline locale strings.
 *
 * Usage:
 * ```tsx
 * t({ en: "Hello", zh: "你好" })
 * t({ en: "<strong>Bold</strong>", zh: "<strong>粗体</strong>" }, { parse: true })
 * ```
 *
 * The Babel plugin transforms all t() calls into key-based lookups
 * at compile time. This function signature exists for TypeScript
 * type checking — the body is never reached in normal operation.
 */
export function t(translations: Record<SupportedLocale, string>): string;
export function t(
  translations: Record<SupportedLocale, string>,
  opts: { parse: true },
): ReactNode;
export function t(
  _translations: Record<SupportedLocale, string>,
  _opts?: { parse?: boolean },
): string | ReactNode {
  throw new Error("t() was not transformed by the i18n Babel plugin");
}
