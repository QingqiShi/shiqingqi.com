import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { AnchorButton } from "#src/links/anchor-button.tsx";
import { FinanceFrame } from "./finance-frame.tsx";

/**
 * Finance's 404. A `not-found.tsx` gets no client translation bundle, so this
 * stays a Server Component and every client component in it takes its copy
 * as a prop.
 */
export function FinanceNotFoundScreen() {
  const locale = getLocale();
  return (
    <FinanceFrame brand={t({ en: "Finance", zh: "家庭账本" })}>
      <div css={stack.item}>
        <div css={stack.tight}>
          <Heading level={1} look="h2">
            {t({ en: "This page doesn't exist", zh: "该页面不存在" })}
          </Heading>
          <Text tone="muted">
            {t({
              en: "The link may be out of date, or the page may have moved.",
              zh: "链接可能已失效，或页面已移动。",
            })}
          </Text>
        </div>
        <div>
          <AnchorButton
            href={getLocalePath("/", locale)}
            look="primary"
            icon={<HouseIcon weight="bold" />}
          >
            {t({ en: "Back to Finance", zh: "返回家庭账本" })}
          </AnchorButton>
        </div>
      </div>
    </FinanceFrame>
  );
}
