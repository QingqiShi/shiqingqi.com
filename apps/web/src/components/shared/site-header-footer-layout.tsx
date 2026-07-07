import { FixedContainerContent } from "@tuja/ui/components/fixed-container-content";
import { HeaderFooterLayout } from "@tuja/ui/components/header-footer-layout";
import type { ReactNode } from "react";
import { BackButton } from "#src/components/shared/back-button.tsx";
import { LocaleSelector } from "#src/components/shared/locale-selector.tsx";
import { ThemeSwitch } from "#src/components/shared/theme-switch.tsx";
import { t } from "#src/i18n.ts";
import type { SupportedLocale } from "#src/types.ts";

interface SiteHeaderFooterLayoutProps {
  locale: SupportedLocale;
  /** Full-bleed decoration behind the content (gradients, glows). */
  background?: ReactNode;
  /** Footer element pinned to the bottom of the centered measure. */
  footer?: ReactNode;
  /** Caps the content into the site's reading column. */
  readingColumn?: boolean;
  /** Narrows the reading column below the site default. */
  contentMaxInlineSize?: string;
  as?: "main" | "div";
  children: ReactNode;
}

/**
 * The site's application of `HeaderFooterLayout`: it fills the header bar with
 * the standard back, theme, and language controls so every header/footer page
 * gets identical chrome from one place, and forwards the background, footer, and
 * content-width slots. The back button and theme toggle sit on their own
 * compositing layers (`FixedContainerContent`) to avoid flashing during view
 * transitions, matching the rest of the fixed chrome.
 */
export function SiteHeaderFooterLayout({
  locale,
  background,
  footer,
  readingColumn,
  contentMaxInlineSize,
  as,
  children,
}: SiteHeaderFooterLayoutProps) {
  return (
    <HeaderFooterLayout
      as={as}
      background={background}
      footer={footer}
      readingColumn={readingColumn}
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
                t({ en: "Switch to system theme", zh: "切换至系统颜色模式" }),
              ]}
            />
          </FixedContainerContent>
          <LocaleSelector
            label={t({ en: "Language", zh: "语言" })}
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
