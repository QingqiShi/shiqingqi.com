import { getTranslations } from "@/app/translations/getTranslations";
import { PageTitle } from "@/server-components/page-title";
import type { PageProps } from "@/types";
import translations from "./translations.json";

export default async function Page(props: PageProps) {
  const params = await props.params;
  const { t } = getTranslations(translations, params.locale);
  return (
    <>
      <PageTitle
        locale={params.locale}
        type="education"
        title={t("schoolName")}
        role={t("course")}
        date={t("date")}
      />
      <p>{t("grade")}</p>
      <p>{t("modules")}</p>
      <ul>
        <li>{t("dataStructures")}</li>
        <li>{t("algorithms")}</li>
        <li>{t("database")}</li>
        <li>{t("security")}</li>
        <li>{t("network")}</li>
      </ul>
      <p>{t("society")}</p>
    </>
  );
}
