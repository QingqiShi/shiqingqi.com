import { Anchor } from "../../../../../server-components/anchor";
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
        type="education"
        title={t("schoolName")}
        role={t("course")}
        date={t("date")}
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
