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
        title="Wunderman Thompson Commerce"
        role={t("role")}
        date={t("date")}
        locale={params.locale}
      />
      <p>{t("mainJob")}</p>
      <ul>
        <li>React</li>
        <li>Redux</li>
        <li>Sass</li>
      </ul>
    </>
  );
}
