"use client";

import { ErrorScreen } from "#src/shell/error-screen.tsx";

export default function LocaleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorScreen error={error} onRetry={retry} />;
}
