"use client";

import { ErrorScreen } from "#src/components/shared/error-screen.tsx";

/**
 * Error boundary for the design system. It renders inside the section's
 * SidebarLayout (design-system/layout.tsx), so a page error keeps the sidebar
 * — title, navigation, theme, and language controls — in place. Without it,
 * errors would bubble to [locale]/error.tsx, which sits above the shell and
 * would strip the section's only navigation.
 */
export default function DesignSystemError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ErrorScreen error={error} onRetry={unstable_retry} />;
}
