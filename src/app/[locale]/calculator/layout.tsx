import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { BASE_URL } from "#src/constants.ts";
import { space } from "#src/tokens.stylex.ts";
import type { PageProps, SupportedLocale } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import translations from "./translations.json";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const validatedLocale: SupportedLocale = validateLocale(params.locale);
  const { t } = getTranslations(translations, validatedLocale);
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: new URL("/calculator", BASE_URL).toString(),
      languages: {
        en: new URL("/calculator", BASE_URL).toString(),
        zh: new URL("/zh/calculator", BASE_URL).toString(),
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
  return <div css={styles.container}>{children}</div>;
}

const styles = stylex.create({
  container: {
    padding: space._3,
    paddingTop: `calc(${space._10} + env(safe-area-inset-top))`,
    paddingBottom: `calc(${space._3} + env(safe-area-inset-bottom))`,
    height: "100dvh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
});
