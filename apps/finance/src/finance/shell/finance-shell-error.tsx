"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import * as stylex from "@stylexjs/stylex";
import { captureException } from "@tuja/analytics/capture-exception";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { controlSize, space } from "@tuja/ui/tokens.stylex";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

// An error boundary is not an entry that the i18n codegen traces, so it gets
// no client translation bundle and `t()` throws here. This screen keeps its
// own copy.
const copy = {
  en: {
    heading: "Something went wrong",
    text: "An unexpected error stopped this screen. Your data is safe. Try again, or open another screen.",
    retry: "Try again",
  },
  zh: {
    heading: "出了点问题",
    text: "此页面因意外错误中断。你的数据是安全的。请重试，或打开其他页面。",
    retry: "重试",
  },
};

/**
 * The error of one screen, inside the Finance shell: the destinations and
 * the sync status stay, so the visitor can go to another screen.
 */
export function FinanceShellError({
  error,
  onRetry,
}: {
  error: Error & { digest?: string };
  onRetry: () => void;
}) {
  const strings = copy[useLocale()];

  useEffect(() => {
    console.error("Screen error:", error);
    captureException(error);
  }, [error]);

  // Next clears an error when the path changes, but not when only the query
  // changes, and a Finance screen keeps its pick, such as an account, in the
  // query.
  const search = useSearchParams().toString();
  const lastSearchRef = useRef(search);
  useEffect(() => {
    if (lastSearchRef.current === search) return;
    lastSearchRef.current = search;
    onRetry();
  }, [search, onRetry]);

  return (
    <NavigationStack label={strings.heading}>
      <div css={[stack.item, styles.notice]} role="alert">
        <span css={styles.icon}>
          <WarningCircleIcon weight="bold" role="presentation" />
        </span>
        <div css={stack.text}>
          <Heading level={1} look="h3">
            {strings.heading}
          </Heading>
          <Text as="p" tone="muted">
            {strings.text}
          </Text>
        </div>
        <div>
          <Button
            look="primary"
            icon={<ArrowClockwiseIcon weight="bold" />}
            onClick={onRetry}
          >
            {strings.retry}
          </Button>
        </div>
      </div>
    </NavigationStack>
  );
}

const styles = stylex.create({
  notice: {
    alignItems: "start",
    paddingBlock: space._8,
  },
  icon: {
    display: "inline-flex",
    fontSize: controlSize._6,
    color: color.destructiveText,
  },
});
