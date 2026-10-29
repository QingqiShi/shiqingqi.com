"use client";

import { t } from "@tuja/i18n";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";

export function MediaRowNumberHeader() {
  return <span css={a11y.srOnly}>{t({ en: "Row", zh: "行" })}</span>;
}
