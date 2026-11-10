"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { font } from "@tuja/ui/tokens.stylex";

/**
 * A folder's name in a sentence. It goes to the next line as one piece, and
 * breaks only when it is longer than a line.
 */
export function Folder({ path }: { path: string }) {
  const inbox = t({ en: "Inbox", zh: "收件箱" });
  const name = path.toUpperCase() === "INBOX" ? inbox : path;
  return <span css={styles.folder}>{name.replaceAll(" ", "\u00a0")}</span>;
}

const styles = stylex.create({
  folder: {
    fontWeight: font.weight_6,
    wordBreak: "keep-all",
    overflowWrap: "anywhere",
  },
});
