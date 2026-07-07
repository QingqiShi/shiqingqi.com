"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { align, flex, justify } from "@tuja/ui/primitives/flex.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { useParams } from "next/navigation";
import { useEffect } from "react";

// Error boundaries render outside the normal provider tree — the i18n
// ClientTranslationsProvider is not guaranteed to sit above them — so this
// screen is deliberately self-contained: it reads the locale straight from the
// route params and carries its own copy rather than going through `t()`, which
// would throw on a missing key when no provider is present.
const copy = {
  en: {
    heading: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
    retry: "Try again",
  },
  zh: {
    heading: "出了点问题",
    description: "发生了意外错误，请重试。",
    retry: "重试",
  },
};

interface ErrorScreenProps {
  error: Error & { digest?: string };
  onRetry: () => void;
}

export function ErrorScreen({ error, onRetry }: ErrorScreenProps) {
  const params = useParams();
  const strings = params.locale === "zh" ? copy.zh : copy.en;

  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div
      css={[flex.col, align.center, justify.center, styles.container]}
      role="alert"
    >
      <h1 css={styles.heading}>{strings.heading}</h1>
      <p css={styles.description}>{strings.description}</p>
      <Button variant="primary" onClick={onRetry} css={styles.button}>
        {strings.retry}
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
