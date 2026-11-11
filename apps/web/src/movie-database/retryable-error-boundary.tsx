"use client";

import * as stylex from "@stylexjs/stylex";
import { captureException } from "@tuja/analytics/capture-exception";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({
  resetErrorBoundary,
  message,
}: {
  resetErrorBoundary: () => void;
  message: string;
}) {
  return (
    <EmptyState
      role="alert"
      title={message}
      action={
        <Button look="primary" onClick={resetErrorBoundary}>
          {t({ en: "Try again", zh: "重试" })}
        </Button>
      }
      css={styles.errorContainer}
    />
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
    justifyContent: "center",
    minHeight: "60vh",
  },
});
