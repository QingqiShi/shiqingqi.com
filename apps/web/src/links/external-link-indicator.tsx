"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { t } from "#src/i18n.ts";

export function ExternalLinkIndicator() {
  return (
    <>
      <ArrowSquareOutIcon
        weight="regular"
        aria-hidden="true"
        {...stylex.props(styles.icon)}
      />
      <span css={a11y.srOnly}>
        {t({ en: "(opens in new tab)", zh: "(在新标签页中打开)" })}
      </span>
    </>
  );
}

const styles = stylex.create({
  // The indicator is smaller than the link text, so that it stays quiet.
  icon: {
    inlineSize: "0.85em",
    blockSize: "0.85em",
    verticalAlign: "baseline",
    position: "relative",
    top: "0.1em",
    left: "0.1em",
    opacity: 0.7,
  },
});
