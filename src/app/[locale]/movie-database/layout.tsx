import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { Providers } from "@/components/shared/providers";
import { BASE_URL } from "@/constants";
import { space } from "@/tokens.stylex";
import type { LayoutProps, PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "./translations.json";

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const { t } = getTranslations(translations, params.locale);
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

export default function Layout({ children }: LayoutProps) {
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
