"use client";

import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { useParams } from "next/navigation";
import { ErrorScreen } from "#src/site-shell/error-screen.tsx";

/**
 * Catch-all error boundary for the [locale] segment. It renders directly below
 * [locale]/layout.tsx, so surfaces whose chrome lives in a child layout — the
 * tool pages' screen, the design system's sidebar — fall back to this screen
 * of its own. The tool pages additionally get (with-header)/error.tsx, and the
 * movie database movie-database/error.tsx, which keep their screen in place on
 * error so users can still navigate away. This boundary is above the
 * translations, so it reads the locale from the URL.
 */
export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const { locale } = useParams();
  return (
    <NavigationStack label={locale === "zh" ? "页面出错" : "Page error"}>
      <ErrorScreen error={error} onRetry={unstable_retry} />
    </NavigationStack>
  );
}
