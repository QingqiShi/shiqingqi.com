import { getTranslations } from "@/app/translations/getTranslations";
import { Anchor } from "@/server-components/anchor";
import type { PageProps } from "@/types";
import { PageTitle } from "../../page-title";
import translations from "./translations.json";

export default async function Page(props: PageProps) {
  const params = await props.params;
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
