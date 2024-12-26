import { PageTitle } from "../../../../../server-components/page-title";
import type { PageProps } from "../../../../../types";
import { getTranslations } from "../../../../translations/getTranslations";
import translations from "./translations.json";

export default async function Page(props: PageProps) {
  const params = await props.params;
  const { t } = getTranslations(translations, params.locale);
  return (
    <>
      <PageTitle
        locale={params.locale}
        type="experience"
        title="Wunderman Thompson Commerce"
        role={t("role")}
        date={t("date")}
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
