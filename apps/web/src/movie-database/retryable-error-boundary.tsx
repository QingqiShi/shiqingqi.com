"use client";

import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { ErrorBoundary } from "react-error-boundary";
import { captureException } from "#src/analytics/capture-exception.ts";
import { t } from "#src/i18n.ts";

function ErrorFallback({
  resetErrorBoundary,
  message,
}: {
  resetErrorBoundary: () => void;
  message: string;
}) {
  return (
    <div css={styles.errorContainer} role="alert">
      <p css={[typeRole.body, styles.errorText]}>{message}</p>
      <button
        type="button"
        css={[typeRole.body, corner.radius_round, styles.retryButton]}
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
      onError={captureException}
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
    gap: rhythm.item,
    minHeight: "60vh",
    padding: space._6,
    textAlign: "center",
  },
  errorText: {
    color: color.fgMuted,
    margin: 0,
  },
  retryButton: {
    paddingBlock: space._2,
    paddingInline: space._5,
    fontWeight: font.weight_5,
    fontFamily: font.family,
    borderWidth: 0,
    borderStyle: "none",
    backgroundColor: color.bgAccent,
    color: color.fgOnAccent,
    cursor: "pointer",
  },
});
