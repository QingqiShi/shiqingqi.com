import type { Metadata } from "next";
import type { PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "../translations.json";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const { t } = getTranslations(translations, params.locale);

  return {
    title: t("aiSearchResults"),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function AISearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
