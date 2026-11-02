"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { font } from "@tuja/ui/tokens.stylex";

export function Folder({ path }: { path: string }) {
  const inbox = t({ en: "Inbox", zh: "收件箱" });
  return (
    <span css={styles.folder}>
      {path.toUpperCase() === "INBOX" ? inbox : path}
    </span>
  );
}

const styles = stylex.create({
  folder: {
    fontWeight: font.weight_6,
  },
});
