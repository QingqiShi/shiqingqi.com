import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { AssistantFrame } from "./assistant-frame.tsx";

/**
 * The 404. A `not-found.tsx` gets no client translation bundle, so this
 * stays a Server Component and every client component in it takes its copy
 * as a prop.
 */
export function NotFoundScreen() {
  const locale = getLocale();
  return (
    <AssistantFrame brand={t({ en: "Qi Assistant", zh: "Qi Assistant" })}>
      <div css={stack.item}>
        <div css={stack.tight}>
          <Heading level={1} look="h1">
            {t({ en: "This page doesn’t exist", zh: "该页面不存在" })}
          </Heading>
          <Text tone="muted">
            {t({
              en: "The link may be out of date, or the page may have moved.",
              zh: "链接可能已失效，或页面已移动。",
            })}
          </Text>
        </div>
        <Button
          href={getLocalePath("/", locale)}
          look="primary"
          size="lg"
          icon={<HouseIcon weight="bold" />}
          css={styles.wide}
        >
          {t({ en: "Back to Today", zh: "返回今天" })}
        </Button>
      </div>
    </AssistantFrame>
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
