import { PageProps } from "../../types";
import { getTranslations } from "../translations/getTranslations";
import translations from "./translations.json";

export default function Home({ params }: PageProps) {
  const { t } = getTranslations(translations, params.locale);
  return (
    <div>
      <h1>
        {t("headline_1")}
        <br />
        {t("headline_2")}
      </h1>
    </div>
  );
}

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
}
