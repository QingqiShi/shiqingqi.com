import { t } from "@tuja/i18n";
import { setLocale } from "@tuja/i18n/server-locale";
import type { SupportedLocale } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { SiteNavigationStack } from "#src/site-shell/site-navigation-stack.tsx";

/**
 * Route group for the tool pages, such as the calculator: each is one
 * screen with nothing beside it, with the way back to the home page and
 * the theme and language controls at its top. The error boundary of the group
 * renders inside the screen, so a page error leaves them in place.
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
    <SiteNavigationStack
      locale={validatedLocale}
      label={t({ en: "Tool", zh: "工具" })}
    >
      {children}
    </SiteNavigationStack>
  );
}
