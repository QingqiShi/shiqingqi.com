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
        type="experience"
        title="Citadel"
        role={t("role")}
        date={t("date")}
        locale={params.locale}
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
