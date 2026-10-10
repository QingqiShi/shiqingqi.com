"use client";

import { ErrorScreen } from "#src/site-shell/error-screen.tsx";

/**
 * Error boundary for the reading pages, and through a re-export for the movie
 * database. It renders inside the segment's layout — below the header the
 * layout renders as a sibling of the page — so a page error still leaves the
 * back button, theme toggle, and language picker in place. Without this
 * boundary, errors here would bubble to [locale]/error.tsx, which sits above
 * the header and would strand the user on a screen with no way to navigate
 * away.
 */
export default function WithHeaderError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ErrorScreen error={error} onRetry={unstable_retry} />;
}
