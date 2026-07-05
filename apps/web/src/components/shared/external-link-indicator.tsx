"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { t } from "#src/i18n.ts";

export function ExternalLinkIndicator() {
  return (
    <>
      <ArrowSquareOutIcon size="0.85em" css={styles.icon} aria-hidden="true" />
      <span css={a11y.srOnly}>
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
});
