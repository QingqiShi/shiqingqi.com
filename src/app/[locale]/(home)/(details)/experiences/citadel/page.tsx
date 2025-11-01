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
