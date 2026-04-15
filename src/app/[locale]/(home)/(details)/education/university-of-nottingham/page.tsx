import type { Metadata } from "next";
import { DetailPageTitle } from "#src/components/home/detail-page-title.tsx";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  validateLocale(params.locale);
  const title = t({
    en: "Education at University of Nottingham",
    zh: "诺丁汉大学 教育",
  });
  const description = t({
    en: "Qingqi graduated from the University of Nottingham with a First-class Honours degree in BSc Computer Science.",
    zh: "石清琪毕业于诺丁汉大学，取得了《计算机科学》荣誉理学学士。",
  });
  const url =
    params.locale === "zh"
      ? new URL("/zh/education/university-of-nottingham", BASE_URL).toString()
      : new URL("/education/university-of-nottingham", BASE_URL).toString();
  return {
    title,
    description,
    alternates: {
      canonical: new URL(
        "/education/university-of-nottingham",
        BASE_URL,
      ).toString(),
      languages: {
        en: new URL("/education/university-of-nottingham", BASE_URL).toString(),
        zh: new URL(
          "/zh/education/university-of-nottingham",
          BASE_URL,
        ).toString(),
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: t({ en: "Qingqi Shi", zh: "石清琪" }),
      locale: params.locale === "zh" ? "zh_CN" : "en_US",
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  } satisfies Metadata;
}

export default function Page() {
  return (
    <>
      <DetailPageTitle
        type="education"
        title={t({ en: "University of Nottingham", zh: "诺丁汉大学" })}
        role={t({
          en: "BSc Hons Computer Science",
          zh: "荣誉理学学士 - 计算机科学",
        })}
        date={t({ en: "Sep 2013 - Jul 2016", zh: "2013年9月 - 2016年7月" })}
      />
      <p>
        {t({ en: "Grade: First-class Honours", zh: "学位等级：一等荣誉学位" })}
      </p>
      <p>{t({ en: "Core Courses:", zh: "核心科目：" })}</p>
      <ul>
        <li>{t({ en: "Data Structures", zh: "数据结构" })}</li>
        <li>{t({ en: "Algorithms", zh: "算法" })}</li>
        <li>{t({ en: "Database", zh: "数据库" })}</li>
        <li>{t({ en: "Security", zh: "信息安全" })}</li>
        <li>{t({ en: "Network", zh: "网络" })}</li>
      </ul>
      <p>
        {t({
          en: "Extra: Chinese Students and Scholars Association, IT Officer",
          zh: "社团：中国学生学者联谊会 IT 部长",
        })}
      </p>
    </>
  );
}
