"use client";

import { ErrorScreen } from "#src/components/shared/error-screen.tsx";

/**
 * Error boundary for the home surface. It renders inside the home layout's
 * SiteHeaderFooterLayout — below the header bar and above the footer — so a
 * page error keeps the back, theme, and language controls in place.
 */
export default function HomeError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ErrorScreen error={error} onRetry={unstable_retry} />;
}
