"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";

export function ExternalLinkIndicator() {
  return (
    <>
      <ArrowSquareOutIcon size="0.85em" css={styles.icon} aria-hidden="true" />
      <span css={styles.srOnly}>
        {t({ en: "(opens in new tab)", zh: "(在新标签页中打开)" })}
      </span>
    </>
  );
}

const styles = stylex.create({
  icon: {
    verticalAlign: "baseline",
    position: "relative",
    top: "0.1em",
    marginInlineStart: "0.1em",
    opacity: 0.7,
  },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
});
