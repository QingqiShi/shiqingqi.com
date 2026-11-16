import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { AuthFrame } from "./auth-frame.tsx";

/**
 * The 404. A `not-found.tsx` gets no client translation bundle, so this
 * stays a Server Component and every client component in it takes its copy
 * as a prop.
 */
export function NotFoundScreen() {
  return (
    <AuthFrame>
      <div css={stack.item}>
        <div css={stack.tight}>
          <Heading level={1} look="h2">
            {t({ en: "This page doesn’t exist", zh: "该页面不存在" })}
          </Heading>
          <Text tone="muted">
            {t({
              en: "The link may be out of date, or this Miao may be private.",
              zh: "链接可能已失效，或这只小苗未公开。",
            })}
          </Text>
        </div>
        <div>
          <Button
            href={getLocalePath("/", getLocale())}
            look="primary"
            icon={<HouseIcon weight="bold" />}
          >
            {t({ en: "Back to home", zh: "返回首页" })}
          </Button>
        </div>
      </div>
    </AuthFrame>
  );
}
