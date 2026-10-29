"use client";

import { FinanceErrorScreen } from "#src/finance/shell/finance-error-screen.tsx";

export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <FinanceErrorScreen error={error} onRetry={unstable_retry} />;
}
