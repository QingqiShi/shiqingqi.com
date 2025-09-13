import type { Metadata } from "next";
import { BASE_URL } from "@/constants";
import type { PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { validateLocale } from "@/utils/validate-locale";
import translations from "./translations.json";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const validatedLocale = validateLocale(params.locale);
  const { t } = getTranslations(translations, validatedLocale);
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: new URL("/experiences/citadel", BASE_URL).toString(),
      languages: {
        en: new URL("/experiences/citadel", BASE_URL).toString(),
        zh: new URL("/zh/experiences/citadel", BASE_URL).toString(),
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
  return children;
}
