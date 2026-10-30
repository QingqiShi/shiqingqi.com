import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { Link } from "#src/links/link.tsx";
import { LocaleSelector } from "#src/site-shell/locale-selector.tsx";
import { ThemeSwitch } from "#src/theme/theme-switch.tsx";

/**
 * Utility region pinned to the bottom of the design-system sidebar, as one
 * group of compact icon controls: the way back home (the shell has no global
 * header, so this is the only route back out), then the language picker and
 * the theme toggle that header-driven pages get from the fixed header chrome.
 */
export function DesignSystemSidebarControls({
  locale,
}: {
  locale: SupportedLocale;
}) {
  return (
    <div css={row.tight}>
      <AnchorButton
        href={getLocalePath("/", locale)}
        linkComponent={Link}
        size="sm"
        icon={<HouseIcon weight="bold" />}
        aria-label={t({ en: "Home", zh: "首页" })}
      />
      <LocaleSelector
        size="sm"
        ariaLabel={t({ en: "Select a language", zh: "选择语言" })}
        locale={locale}
        menuPosition="bottomLeft"
      />
      <ThemeSwitch
        size="sm"
        labels={[
          t({ en: "Switch to light theme", zh: "切换至浅色模式" }),
          t({ en: "Switch to dark theme", zh: "切换至深色模式" }),
        ]}
      />
    </div>
  );
}
