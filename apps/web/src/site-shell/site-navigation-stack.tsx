import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import {
  NavigationStack,
  type SplitViewBackLink,
} from "@tuja/ui/components/navigation-stack";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";
import { ThemeSwitch } from "#src/theme/theme-switch.tsx";
import { LocaleSelector } from "./locale-selector.tsx";

interface SiteNavigationStackProps {
  locale: SupportedLocale;
  /** Names the screen for assistive technology. */
  label: string;
  /** The way back. Without it, the screen leads back to the home page. */
  back?: SplitViewBackLink;
  css?: StyleProp;
  children: ReactNode;
}

/** The theme and language controls of the site, for the top end of a screen. */
export function SiteToolbar({ locale }: { locale: SupportedLocale }) {
  return (
    <>
      <ThemeSwitch
        labels={[
          t({ en: "Switch to light theme", zh: "切换至浅色模式" }),
          t({ en: "Switch to dark theme", zh: "切换至深色模式" }),
        ]}
      />
      <LocaleSelector
        ariaLabel={t({ en: "Select a language", zh: "选择语言" })}
        locale={locale}
      />
    </>
  );
}

/**
 * A screen of the site with nothing beside it, such as a tool: the way back at
 * its top start, and the theme and language controls at its top end.
 */
export function SiteNavigationStack({
  locale,
  label,
  back,
  css,
  children,
}: SiteNavigationStackProps) {
  return (
    <NavigationStack
      label={label}
      css={css}
      back={
        back ?? {
          href: getLocalePath("/", locale),
          label: t({ en: "Home", zh: "首页" }),
        }
      }
      toolbar={<SiteToolbar locale={locale} />}
    >
      {children}
    </NavigationStack>
  );
}
