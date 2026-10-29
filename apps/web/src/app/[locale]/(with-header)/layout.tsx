import { setLocale } from "@tuja/i18n/server-locale";
import type { SupportedLocale } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { SiteHeaderFooterLayout } from "#src/site-shell/site-header-footer-layout.tsx";

/**
 * Route group for the header-only surfaces — the tool pages (calculator,
 * sprite editor, and friends). They share the site's floating header controls
 * but carry no footer, so they use SiteHeaderFooterLayout without a footer
 * slot. Content-and-footer surfaces (the home page and detail pages) and the
 * movie database, whose header controls sit on the wide page column, own their
 * own shell instance outside this group, and the design system uses
 * SidebarLayout — a page gets exactly one shell, never both.
 *
 * `as="div"` because pages in this group provide their own `<main>` where they
 * have one; the shell doesn't add a second landmark.
 */
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);
  // A layout can render before the root layout sets the locale, so it sets it too.
  setLocale(validatedLocale);

  return (
    <SiteHeaderFooterLayout locale={validatedLocale} as="div">
      {children}
    </SiteHeaderFooterLayout>
  );
}
