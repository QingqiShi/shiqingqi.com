"use client";

import { ErrorScreen } from "#src/assistant/shell/error-screen.tsx";

export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ErrorScreen error={error} onRetry={unstable_retry} />;
}
