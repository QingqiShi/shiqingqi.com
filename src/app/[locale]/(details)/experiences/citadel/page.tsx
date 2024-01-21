import { PageTitle } from "../../../../../server-components/page-title";
import type { PageProps } from "../../../../../types";
import { getTranslations } from "../../../../translations/getTranslations";
import translations from "./translations.json";

export default function Page({ params }: PageProps) {
  const { t } = getTranslations(translations, params.locale);
  return (
    <>
      <PageTitle
        locale={params.locale}
        type="experience"
        title="Citadel"
        role={t("role")}
        date={t("date")}
      />
      <p>{t("responsibilities")}</p>
      <p>{t("techStack")}</p>
      <ul>
        <li>React</li>
        <li>TypeScript</li>
        <li>AG Grid</li>
      </ul>
    </>
  );
}
