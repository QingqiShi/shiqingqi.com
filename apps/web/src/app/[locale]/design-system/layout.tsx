import { t } from "@tuja/i18n";
import type { PageProps, SupportedLocale } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { BASE_URL } from "#src/constants.ts";
import { DesignSystemFrame } from "#src/design-system/design-system-frame.tsx";
import { DesignSystemNav } from "#src/design-system/design-system-nav.tsx";
import { DesignSystemSidebarControls } from "#src/design-system/design-system-sidebar-controls.tsx";
import { DesignSystemSidebarHeader } from "#src/design-system/design-system-sidebar-header.tsx";
import { PlaceholderLinkGuard } from "#src/design-system/placeholder-link-guard.tsx";
import { getDesignSystemGroupLabels } from "#src/design-system/route-copy/get-design-system-group-labels.ts";
import { getDesignSystemRouteLabels } from "#src/design-system/route-copy/get-design-system-route-labels.ts";
import { SkipToContent } from "#src/design-system/skip-to-content.tsx";

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

  // The view stays mounted across navigation while only the page swaps. The
  // design system has no fixed header: the sidebar carries the title, the theme
  // toggle and the language picker. The skip link is the first tab stop, ahead of
  // the many route links, so it renders before the view.
  return (
    <>
      <SkipToContent />
      <DesignSystemFrame
        sidebar={
          <DesignSystemNav
            routeLabels={getDesignSystemRouteLabels()}
            groupLabels={getDesignSystemGroupLabels()}
          />
        }
        header={<DesignSystemSidebarHeader locale={validatedLocale} />}
        footer={<DesignSystemSidebarControls locale={validatedLocale} />}
        sidebarLabel={t({ en: "Design system", zh: "设计系统" })}
        contentLabel={t({ en: "Page", zh: "页面" })}
        toggleLabel={t({ en: "Sidebar", zh: "侧边栏" })}
      >
        <PlaceholderLinkGuard>{children}</PlaceholderLinkGuard>
      </DesignSystemFrame>
    </>
  );
}
