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
