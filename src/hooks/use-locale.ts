"use client";

import { use } from "react";
import { LocaleContext } from "#src/i18n/locale-context.ts";

export function useLocale() {
  return use(LocaleContext);
}
