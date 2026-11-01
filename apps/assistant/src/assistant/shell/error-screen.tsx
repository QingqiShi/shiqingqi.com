"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useEffect } from "react";
import { AnchorButton } from "#src/links/anchor-button.tsx";
import { AssistantFrame } from "./assistant-frame.tsx";

// An error boundary is not an entry that the i18n codegen traces, so it gets
// no client translation bundle and `t()` throws here. This screen keeps its
// own copy.
const copy = {
  en: {
    brand: "Mail Assistant",
    heading: "Something went wrong",
    text: "An unexpected error stopped this page. Try again, or go back to the digest.",
    retry: "Try again",
    home: "Back to the digest",
  },
  zh: {
    brand: "邮件助手",
    heading: "出了点问题",
    text: "页面因意外错误中断。请重试，或返回摘要。",
    retry: "重试",
    home: "返回摘要",
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
    <AssistantFrame brand={strings.brand}>
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
          <AnchorButton href={getLocalePath("/", locale)}>
            {strings.home}
          </AnchorButton>
        </div>
      </div>
    </AssistantFrame>
  );
}
