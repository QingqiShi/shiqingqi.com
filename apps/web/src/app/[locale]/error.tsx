"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { align, flex, justify } from "@tuja/ui/primitives/flex.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { useEffect } from "react";
import { t } from "#src/i18n.ts";

/**
 * Error boundary for pages within the [locale] layout.
 *
 * Preserves the root layout (header, theme, I18n provider) so users can
 * still navigate. Shows a localized message with a retry button.
 */
export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div
      css={[flex.col, align.center, justify.center, styles.container]}
      role="alert"
    >
      <h1 css={styles.heading}>
        {t({ en: "Something went wrong", zh: "出了点问题" })}
      </h1>
      <p css={styles.description}>
        {t({
          en: "An unexpected error occurred. Please try again.",
          zh: "发生了意外错误，请重试。",
        })}
      </p>
      <Button variant="primary" onClick={unstable_retry} css={styles.button}>
        {t({ en: "Try again", zh: "重试" })}
      </Button>
    </div>
  );
}

const styles = stylex.create({
  container: {
    minHeight: "60dvh",
    textAlign: "center",
    padding: space._4,
  },
  heading: {
    fontSize: font.vpHeading1,
    fontWeight: font.weight_7,
    margin: 0,
  },
  description: {
    fontSize: font.uiBody,
    color: color.textMuted,
    margin: `${space._2} 0 0`,
  },
  button: {
    marginTop: space._4,
  },
});
