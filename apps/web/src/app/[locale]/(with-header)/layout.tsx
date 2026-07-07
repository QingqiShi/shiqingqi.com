import { SiteHeaderFooterLayout } from "#src/components/shared/site-header-footer-layout.tsx";
import type { SupportedLocale } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

/**
 * Route group for the header-only surfaces — the movie database and the tool
 * pages (calculator, sprite editor, and friends). They share the site's fixed
 * header bar but carry no footer, so they use SiteHeaderFooterLayout without a
 * footer slot. Content-and-footer surfaces (the home page and detail pages) own
 * their own shell instance outside this group, and the design system uses
 * SidebarLayout — a page gets exactly one shell, never both.
 *
 * `as="div"` because pages in this group provide their own `<main>` where they
 * have one (e.g. movie detail); the shell doesn't add a second landmark.
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

  return (
    <SiteHeaderFooterLayout locale={validatedLocale} as="div">
      {children}
    </SiteHeaderFooterLayout>
  );
}
