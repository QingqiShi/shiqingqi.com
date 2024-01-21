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
        title="Spotify"
        role={t("role")}
        date={t("date")}
      />
      <p>{t("mainJob")}</p>
      <p>{t("dependabot")}</p>
      <p>{t("companyWide")}</p>
    </>
  );
}
