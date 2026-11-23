"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { useEffect } from "react";
import { StandalonePage } from "./standalone-page.tsx";

// An error boundary is not an entry that the i18n codegen traces, so it gets
// no client translation bundle and `t()` throws here. This screen keeps its
// own copy.
const copy = {
  en: {
    heading: "Something went wrong",
    text: "An unexpected error stopped this page. Try again, or go back to the Desk.",
    retry: "Try again",
    home: "Back to the Desk",
  },
  zh: {
    heading: "出了点问题",
    text: "页面因意外错误中断。请重试，或返回交易台。",
    retry: "重试",
    home: "返回交易台",
  },
};

export function ErrorScreen({
  error,
  onRetry,
}: {
  error: Error & { digest?: string };
  onRetry: () => void;
}) {
  const locale = useLocale();
  const strings = copy[locale];

  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <StandalonePage>
      <EmptyState
        role="alert"
        level={2}
        icon={<WarningCircleIcon weight="bold" />}
        title={strings.heading}
        description={strings.text}
        action={
          <div css={cluster.tight}>
            <Button
              look="primary"
              icon={<ArrowClockwiseIcon weight="bold" />}
              onClick={onRetry}
            >
              {strings.retry}
            </Button>
            <Button href={getLocalePath("/", locale)} look="outline">
              {strings.home}
            </Button>
          </div>
        }
      />
    </StandalonePage>
  );
}
