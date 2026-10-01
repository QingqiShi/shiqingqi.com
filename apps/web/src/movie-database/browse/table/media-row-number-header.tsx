"use client";

import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { t } from "#src/i18n.ts";

export function MediaRowNumberHeader() {
  return <span css={a11y.srOnly}>{t({ en: "Row", zh: "行" })}</span>;
}
