"use client";

import { ErrorScreen } from "#src/site-shell/error-screen.tsx";

/**
 * Catch-all error boundary for the [locale] segment. It renders directly below
 * [locale]/layout.tsx, so surfaces whose chrome lives in a child layout — the
 * reading pages' header, the design system's sidebar — fall back to this bare
 * screen. The reading pages additionally get (with-header)/error.tsx, and the
 * movie database movie-database/error.tsx, which keep their header in place on
 * error so users can still navigate away.
 */
export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ErrorScreen error={error} onRetry={unstable_retry} />;
}
