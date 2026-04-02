"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect } from "react";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";

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
    <div css={styles.container} role="alert">
      <h1 css={styles.heading}>
        {t({ en: "Something went wrong", zh: "出了点问题" })}
      </h1>
      <p css={styles.description}>
        {t({
          en: "An unexpected error occurred. Please try again.",
          zh: "发生了意外错误，请重试。",
        })}
      </p>
      <button css={styles.button} onClick={unstable_retry}>
        {t({ en: "Try again", zh: "重试" })}
      </button>
    </div>
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
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
    paddingBlock: space._2,
    paddingInline: space._5,
    fontSize: font.uiBody,
    fontWeight: font.weight_5,
    fontFamily: font.family,
    borderWidth: 0,
    borderStyle: "none",
    borderRadius: "9999px",
    backgroundColor: color.controlActive,
    color: color.textOnActive,
    cursor: "pointer",
  },
});
