import { DetailPageTitle } from "@/components/home/detail-page-title";
import { Anchor } from "@/components/shared/anchor";
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
        locale={params.locale}
      />
      <p>{t("grade")}</p>
      <p>{t("modules")}</p>
      <ul>
        <li>{t("webDevelopment")}</li>
        <li>{t("graphics")}</li>
        <li>{t("animation")}</li>
        <li>{t("robotics")}</li>
      </ul>
      <p>{t("exampleProjects")}</p>
      <ul>
        <li>
          <Anchor
            href="https://github.com/QingqiShi/Game-of-Life-Website"
            target="_blank"
          >
            Game of Life website
          </Anchor>
        </li>
        <li>
          <Anchor
            href="https://github.com/QingqiShi/Ray-Tracer"
            target="_blank"
          >
            Ray Tracer
          </Anchor>
        </li>
      </ul>
    </>
  );
}
