import type { Metadata } from "next";
import { DetailPageTitle } from "#src/components/home/detail-page-title.tsx";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  validateLocale(params.locale);
  return {
    title: t({
      en: "Education at Altrincham Grammar School for Boys",
      zh: "奥尔特灵厄姆男子文法学校 教育",
    }),
    description: t({
      en: "Qingqi graduated from Altrincham Grammar School for Boys, achieving A*AAB for his A-Levels.",
      zh: "石清琪在奥尔特灵厄姆男子文法学校研读 A-Levels，取得了 A*AAB 的成绩。",
    }),
    alternates: {
      canonical: new URL(
        "/education/altrincham-grammar-school-for-boys",
        BASE_URL,
      ).toString(),
      languages: {
        en: new URL(
          "/education/altrincham-grammar-school-for-boys",
          BASE_URL,
        ).toString(),
        zh: new URL(
          "/zh/education/altrincham-grammar-school-for-boys",
          BASE_URL,
        ).toString(),
      },
    },
  } satisfies Metadata;
}

export default function Page() {
  return (
    <>
      <DetailPageTitle
        type="education"
        title={t({
          en: "Altrincham Grammar School for Boys",
          zh: "奥尔特灵厄姆男子文法学校",
        })}
        role={t({
          en: "A-Levels",
          zh: "A-Levels（普通教育高级程度证书）",
        })}
        date={t({ en: "Sep 2011 - Jul 2013", zh: "2011年9月 - 2013年7月" })}
      />
      <p>{t({ en: "Results: A*AAB", zh: "成绩: A*AAB" })}</p>
      <p>{t({ en: "Subjects:", zh: "科目：" })}</p>
      <ul>
        <li>{t({ en: "Computing", zh: "计算机" })}</li>
        <li>{t({ en: "Mathematics", zh: "数学" })}</li>
        <li>{t({ en: "Chinese", zh: "中文" })}</li>
        <li>{t({ en: "Physics", zh: "物理" })}</li>
      </ul>
    </>
  );
}
