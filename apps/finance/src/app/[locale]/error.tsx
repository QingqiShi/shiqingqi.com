"use client";

import { FinanceErrorScreen } from "#src/finance/shell/finance-error-screen.tsx";

export default function LocaleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <FinanceErrorScreen error={error} onRetry={retry} />;
}
