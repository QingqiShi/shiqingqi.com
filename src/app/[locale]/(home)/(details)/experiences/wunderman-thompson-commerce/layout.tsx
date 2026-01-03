import type { Metadata } from "next";
import { BASE_URL } from "#src/constants.ts";
import type { PageProps } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import translations from "./translations.json";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const validatedLocale = validateLocale(params.locale);
  const { t } = getTranslations(translations, validatedLocale);
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: new URL(
        "/experiences/wunderman-thompson-commerce",
        BASE_URL,
      ).toString(),
      languages: {
        en: new URL(
          "/experiences/wunderman-thompson-commerce",
          BASE_URL,
        ).toString(),
        zh: new URL(
          "/zh/experiences/wunderman-thompson-commerce",
          BASE_URL,
        ).toString(),
      },
    },
  } satisfies Metadata;
}

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
}

export default function Layout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return children;
}
