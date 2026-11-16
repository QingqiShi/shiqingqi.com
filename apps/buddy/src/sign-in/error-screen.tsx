"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useEffect } from "react";
import { BuddyFrame } from "./buddy-frame.tsx";

// An error boundary is not an entry that the i18n codegen traces, so it gets
// no client translation bundle and `t()` throws here. This screen keeps its
// own copy.
const copy = {
  en: {
    brand: "Buddy",
    heading: "Something went wrong",
    text: "An unexpected error stopped this page. Try again, or go back to the home page.",
    retry: "Try again",
    home: "Back to home",
  },
  zh: {
    brand: "搭子",
    heading: "出了点问题",
    text: "页面因意外错误中断。请重试，或返回首页。",
    retry: "重试",
    home: "返回首页",
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
  const homeHref = getLocalePath("/", locale);

  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <BuddyFrame brand={strings.brand} homeHref={homeHref}>
      <div css={stack.item} role="alert">
        <div css={stack.tight}>
          <Heading level={1} look="h2">
            {strings.heading}
          </Heading>
          <Text tone="muted">{strings.text}</Text>
        </div>
        <div css={cluster.tight}>
          <Button
            look="primary"
            icon={<ArrowClockwiseIcon weight="bold" />}
            onClick={onRetry}
          >
            {strings.retry}
          </Button>
          <Button href={homeHref}>{strings.home}</Button>
        </div>
      </div>
    </BuddyFrame>
  );
}
