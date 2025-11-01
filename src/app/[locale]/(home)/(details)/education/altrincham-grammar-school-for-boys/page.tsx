import { DetailPageTitle } from "#src/components/home/detail-page-title.tsx";
import type { PageProps } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
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
        locale={params.locale}
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
