"use client";

import * as stylex from "@stylexjs/stylex";
import { ErrorBoundary } from "react-error-boundary";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";

function ErrorFallback({
  resetErrorBoundary,
  message,
}: {
  resetErrorBoundary: () => void;
  message: string;
}) {
  return (
    <div css={styles.errorContainer} role="alert">
      <p css={styles.errorText}>{message}</p>
      <button
        type="button"
        css={styles.retryButton}
        onClick={resetErrorBoundary}
      >
        {t({ en: "Try again", zh: "重试" })}
      </button>
    </div>
  );
}

export function RetryableErrorBoundary({
  children,
  message,
}: {
  children: React.ReactNode;
  message: string;
}) {
  return (
    <ErrorBoundary
      fallbackRender={({ resetErrorBoundary }) => (
        <ErrorFallback
          resetErrorBoundary={resetErrorBoundary}
          message={message}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

const styles = stylex.create({
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: space._4,
    minHeight: "60vh",
    padding: space._6,
    textAlign: "center",
  },
  errorText: {
    fontSize: font.uiBody,
    color: color.textMuted,
    margin: 0,
  },
  retryButton: {
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
