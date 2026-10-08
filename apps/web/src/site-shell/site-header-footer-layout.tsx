import { FixedContainerContent } from "@tuja/ui/components/fixed-container-content";
import { HeaderFooterLayout } from "@tuja/ui/components/header-footer-layout";
import type { ReactNode } from "react";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { t } from "#src/i18n.ts";
import { ThemeSwitch } from "#src/theme/theme-switch.tsx";
import { BackButton } from "./back-button.tsx";
import { LocaleSelector } from "./locale-selector.tsx";

interface SiteHeaderFooterLayoutProps {
  locale: SupportedLocale;
  /** Full-bleed decoration behind the content (gradients, glows). */
  background?: ReactNode;
  /** Footer element at the bottom of the page, in the page column. */
  footer?: ReactNode;
  /** Sets the content in the page column. */
  pageColumn?: boolean;
  /** Narrows the page column below the site default. */
  contentMaxInlineSize?: string;
  as?: "main" | "div";
  children: ReactNode;
}

/**
 * The site's application of `HeaderFooterLayout`: it fills the two floating
 * header control groups with the standard back, theme, and language controls so
 * every header/footer page gets identical chrome from one place, and forwards
 * the background, footer, and content-width slots. The back button and theme
 * toggle sit on their own compositing layers (`FixedContainerContent`) to avoid
 * flashing during view transitions, matching the rest of the fixed chrome.
 */
export function SiteHeaderFooterLayout({
  locale,
  background,
  footer,
  pageColumn,
  contentMaxInlineSize,
  as,
  children,
}: SiteHeaderFooterLayoutProps) {
  return (
    <HeaderFooterLayout
      as={as}
      background={background}
      footer={footer}
      pageColumn={pageColumn}
      contentMaxInlineSize={contentMaxInlineSize}
      headerStart={
        <FixedContainerContent>
          <BackButton locale={locale} label={t({ en: "Back", zh: "返回" })} />
        </FixedContainerContent>
      }
      headerEnd={
        <>
          <FixedContainerContent>
            <ThemeSwitch
              labels={[
                t({ en: "Switch to light theme", zh: "切换至浅色模式" }),
                t({ en: "Switch to dark theme", zh: "切换至深色模式" }),
              ]}
            />
          </FixedContainerContent>
          <LocaleSelector
            ariaLabel={t({ en: "Select a language", zh: "选择语言" })}
            locale={locale}
          />
        </>
      }
    >
      {children}
    </HeaderFooterLayout>
  );
}
