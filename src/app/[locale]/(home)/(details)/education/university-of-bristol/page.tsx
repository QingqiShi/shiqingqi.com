import type { Metadata } from "next";
import { DetailPageTitle } from "#src/components/home/detail-page-title.tsx";
import { Anchor } from "#src/components/shared/anchor.tsx";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  validateLocale(params.locale);
  return {
    title: t({
      en: "Education at University of Bristol",
      zh: "布里斯托大学 教育",
    }),
    description: t({
      en: "Qingqi graduated from the University of Bristol with a Merit in MSc Advanced Computing - Creative Technology.",
      zh: "石清琪毕业于布里斯托大学，取得了《高级计算机 创新技术》理学硕士。",
    }),
    alternates: {
      canonical: new URL(
        params.locale === "zh"
          ? "/zh/education/university-of-bristol"
          : "/education/university-of-bristol",
        BASE_URL,
      ).toString(),
      languages: {
        en: new URL("/education/university-of-bristol", BASE_URL).toString(),
        zh: new URL("/zh/education/university-of-bristol", BASE_URL).toString(),
      },
    },
  } satisfies Metadata;
}

export default function Page() {
  return (
    <>
      <DetailPageTitle
        type="education"
        title={t({ en: "University of Bristol", zh: "布里斯托大学" })}
        role={t({
          en: "MSc Advanced Computing - Creative Technology",
          zh: "理学硕士 - 高级计算机 创新技术",
        })}
        date={t({ en: "Sep 2016 - Jan 2018", zh: "2016年9月 - 2018年1月" })}
      />
      <p>{t({ en: "Grade: Merit", zh: "学位等级：优等" })}</p>
      <p>{t({ en: "Core Courses:", zh: "核心科目：" })}</p>
      <ul>
        <li>{t({ en: "Web Development", zh: "网络开发" })}</li>
        <li>{t({ en: "Graphics", zh: "图形学" })}</li>
        <li>{t({ en: "Animation", zh: "动画" })}</li>
        <li>{t({ en: "Robotics", zh: "机械" })}</li>
      </ul>
      <p>{t({ en: "Example Projects:", zh: "项目:" })}</p>
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
