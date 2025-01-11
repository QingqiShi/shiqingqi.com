import type { PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { DetailPageTitle } from "../../../../../../components/home/detail-page-title";
import translations from "./translations.json";

export default async function Page(props: PageProps) {
  const params = await props.params;
  const { t } = getTranslations(translations, params.locale);
  return (
    <>
      <DetailPageTitle
        locale={params.locale}
        type="education"
        title={t("schoolName")}
        role={t("course")}
        date={t("date")}
      />
      <p>{t("grade")}</p>
      <p>{t("modules")}</p>
      <ul>
        <li>{t("computing")}</li>
        <li>{t("mathematics")}</li>
        <li>{t("chinese")}</li>
        <li>{t("physics")}</li>
      </ul>
    </>
  );
}
