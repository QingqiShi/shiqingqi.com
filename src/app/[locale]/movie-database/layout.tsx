import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { Providers } from "@/components/shared/providers";
import { BASE_URL } from "@/constants";
import { space } from "@/tokens.stylex";
import type { PageProps, SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { validateLocale } from "@/utils/validate-locale";
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
      canonical: new URL("/movie-database", BASE_URL).toString(),
      languages: {
        en: new URL("/movie-database", BASE_URL).toString(),
        zh: new URL("/zh/movie-database", BASE_URL).toString(),
      },
    },
  } satisfies Metadata;
}

export default function Layout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return (
    <Providers>
      <div css={styles.container}>{children}</div>
    </Providers>
  );
}

const styles = stylex.create({
  container: {
    paddingTop: {
      default: `calc(${space._10} + env(safe-area-inset-top))`,
    },
  },
});
