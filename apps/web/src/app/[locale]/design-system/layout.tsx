import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { SidebarLayout } from "@tuja/ui/components/sidebar-layout";
import { space } from "@tuja/ui/tokens.stylex";
import type { Metadata } from "next";
import { DesignSystemNav } from "#src/components/design-system/design-system-nav.tsx";
import {
  DesignSystemSidebarControls,
  DesignSystemSidebarHeader,
} from "#src/components/design-system/sidebar-chrome.tsx";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import type { PageProps, SupportedLocale } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  validateLocale(params.locale);

  const title = t({
    en: "Design System | Qingqi Shi",
    zh: "设计系统 | 石清琪",
  });
  const description = t({
    en: "Explore Qingqi Shi's design system - tokens, primitives, and components that power a refined visual language across modern web applications.",
    zh: "探索石清琪的设计系统 — 为现代网页应用提供精致视觉语言的设计令牌、原语与组件。",
  });
  const url =
    params.locale === "zh"
      ? new URL("/zh/design-system", BASE_URL).toString()
      : new URL("/design-system", BASE_URL).toString();

  return {
    title: {
      default: title,
      template: t({
        en: "%s | Design System | Qingqi Shi",
        zh: "%s | 设计系统 | 石清琪",
      }),
    },
    description,
    alternates: {
      canonical: url,
      languages: {
        en: new URL("/design-system", BASE_URL).toString(),
        zh: new URL("/zh/design-system", BASE_URL).toString(),
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: t({ en: "Qingqi Shi", zh: "石清琪" }),
      locale: params.locale === "zh" ? "zh_CN" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  } satisfies Metadata;
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);

  // Persistent shell for every design-system route: the rail stays mounted
  // across navigation while only the page content swaps. The design system
  // renders no fixed header — the sidebar carries the title, the theme toggle,
  // and the language picker instead. The content region is the `<main>`
  // landmark, supplied by `SidebarLayout`.
  return (
    <SidebarLayout
      sidebar={<DesignSystemNav />}
      sidebarHeader={<DesignSystemSidebarHeader locale={validatedLocale} />}
      sidebarFooter={<DesignSystemSidebarControls locale={validatedLocale} />}
      menuLabel={t({ en: "Design system menu", zh: "设计系统菜单" })}
      closeLabel={t({ en: "Close menu", zh: "关闭菜单" })}
    >
      {/* Guide pages are reading surfaces inside an app-density shell, so
          the extra headroom above the page title lives here rather than in
          the shell's compact defaults. */}
      <div css={styles.page}>{children}</div>
    </SidebarLayout>
  );
}

const styles = stylex.create({
  page: {
    paddingBlockStart: { default: space._3, [breakpoints.md]: space._7 },
  },
});
