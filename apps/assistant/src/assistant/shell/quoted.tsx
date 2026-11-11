"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { keepHyphenated } from "./keep-hyphenated.tsx";

/** Header text of a mail or a title, or a stand-in when it has none. Plain text only: it is untrusted. */
export function Quoted({
  text,
  lift = true,
}: {
  text: string;
  /**
   * Shows the text at full contrast in a muted line. Off, it takes the colour
   * of its line, as in a sentence that is muted as a whole.
   */
  lift?: boolean;
}) {
  const shown = text.trim() || t({ en: "(no subject)", zh: "（无主题）" });
  // It is a raw span, not `Text`, because it takes the size of the line it
  // is in, and those lines have different type roles.
  return <span css={lift && styles.lifted}>“{keepHyphenated(shown)}”</span>;
}

const styles = stylex.create({
  lifted: {
    color: color.foreground,
  },
});
