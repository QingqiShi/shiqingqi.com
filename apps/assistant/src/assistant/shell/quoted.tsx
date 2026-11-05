"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";

/** Header text of a mail or a title, or a stand-in when it has none. Plain text only: it is untrusted. */
export function Quoted({ text }: { text: string }) {
  const shown = text.trim() || t({ en: "(no subject)", zh: "（无主题）" });
  return <span css={styles.quoted}>“{shown}”</span>;
}

const styles = stylex.create({
  quoted: {
    color: color.fg,
  },
});
