import { FileDashedIcon } from "@phosphor-icons/react/dist/ssr/FileDashed";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { Button } from "@tuja/ui/components/button";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { StandalonePage } from "./standalone-page.tsx";

/**
 * The 404. A `not-found.tsx` gets no client translation bundle, so this
 * stays a Server Component and every client component in it takes its copy
 * as a prop.
 */
export function NotFoundScreen() {
  return (
    <StandalonePage>
      <EmptyState
        level={2}
        icon={<FileDashedIcon weight="bold" />}
        title={t({ en: "This page doesn’t exist", zh: "该页面不存在" })}
        description={t({
          en: "The link may be out of date.",
          zh: "链接可能已失效。",
        })}
        action={
          <Button href={getLocalePath("/", getLocale())} look="primary">
            {t({ en: "Back to the Desk", zh: "返回交易台" })}
          </Button>
        }
      />
    </StandalonePage>
  );
}
