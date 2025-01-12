import { DetailPageTitle } from "@/components/home/detail-page-title";
import type { PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "./translations.json";

export default async function Page(props: PageProps) {
  const params = await props.params;
  const { t } = getTranslations(translations, params.locale);
  return (
    <>
      <DetailPageTitle
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
