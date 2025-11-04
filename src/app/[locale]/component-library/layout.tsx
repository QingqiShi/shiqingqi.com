import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { TranslationProvider } from "#src/components/shared/translation-provider.tsx";
import { BASE_URL } from "#src/constants.ts";
import { controlSize, space } from "#src/tokens.stylex.ts";
import type { PageProps, SupportedLocale } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import translations from "./translations.json";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const validatedLocale: SupportedLocale = validateLocale(params.locale);
  const { t } = getTranslations(translations, validatedLocale);
  return {
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    alternates: {
      canonical: new URL("/component-library", BASE_URL).toString(),
      languages: {
        en: new URL("/component-library", BASE_URL).toString(),
        zh: new URL("/zh/component-library", BASE_URL).toString(),
      },
    },
  } satisfies Metadata;
}

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
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

  return (
    <TranslationProvider
      locale={validatedLocale}
      translations={{ componentLibrary: translations }}
    >
      <div css={styles.container}>
        <main css={styles.main}>{children}</main>
      </div>
    </TranslationProvider>
  );
}

const styles = stylex.create({
  container: {
    maxWidth: {
      default: "1080px",
      [breakpoints.xl]: "calc((1080 / 24) * 1rem)",
    },
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  main: {
    paddingTop: {
      default: `calc(${space._10} + env(safe-area-inset-top) + ${controlSize._9} + ${space._3})`,
    },
  },
});
