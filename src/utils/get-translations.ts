import "server-only";
import type { ReactNode } from "react";
import type { SupportedLocale, TranslationConfig } from "@/types";
import { parseMessage } from "./parse-message";

export function getTranslations<T extends TranslationConfig>(
  translationConfig: T,
  locale: SupportedLocale,
) {
  function t(key: keyof typeof translationConfig): string;
  function t(
    key: keyof typeof translationConfig,
    opts: { parse?: boolean },
  ): ReactNode;
  function t(
    key: keyof typeof translationConfig,
    { parse }: { parse?: boolean } = {},
  ): ReactNode | string {
    const message = translationConfig[key][locale];
    if (!message) {
      throw new Error(
        `Translation for key "${key as string}" in locale "${locale}" not found`,
      );
    }
    if (parse) {
      return parseMessage(message);
    }
    return message;
  }

  return { t };
}
