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
        title="Spotify"
        role={t("role")}
        date={t("date")}
        locale={params.locale}
      />
      <p>{t("mainJob")}</p>
      <p>{t("dependabot")}</p>
      <p>{t("companyWide")}</p>
    </>
  );
}
