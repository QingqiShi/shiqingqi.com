"use client";

import { FinanceShellError } from "#src/finance/shell/finance-shell-error.tsx";

/**
 * Catches the error of a screen below the `(app)` layout, so the shell stays
 * mounted and sync continues. Without it, the error goes to
 * `[locale]/error.tsx`, which is above the shell and replaces it.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <FinanceShellError error={error} onRetry={retry} />;
}
