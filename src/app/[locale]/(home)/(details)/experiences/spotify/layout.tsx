import type { Metadata } from "next";
import { BASE_URL } from "@/constants";
import type { LayoutProps, PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "./translations.json";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const { t } = getTranslations(translations, params.locale);
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: new URL("/experiences/spotify", BASE_URL).toString(),
      languages: {
        en: new URL("/experiences/spotify", BASE_URL).toString(),
        zh: new URL("/zh/experiences/spotify", BASE_URL).toString(),
      },
    },
  } satisfies Metadata;
}

export default function Layout({ children }: LayoutProps) {
  return children;
}
