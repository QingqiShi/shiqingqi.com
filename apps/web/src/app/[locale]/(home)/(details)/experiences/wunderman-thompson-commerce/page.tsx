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
    en: "Front-End Developer at Wunderman Thompson Commerce - Enhancing E-commerce Websites",
    zh: "Wunderman Thompson Commerce 的前端开发人员 - 提升电子商务网站体验",
  });
  const description = t({
    en: "Explore Qingqi Shi's role as a front-end developer at Wunderman Thompson Commerce, where he enhanced e-commerce websites and took on tech lead responsibilities.",
    zh: "探讨石清琪在 Wunderman Thompson Commerce 担任前端开发人员的角色，他在提升电子商务网站体验和承担技术负责人职责方面发挥了关键作用。",
  });
  const url =
    params.locale === "zh"
      ? new URL(
          "/zh/experiences/wunderman-thompson-commerce",
          BASE_URL,
        ).toString()
      : new URL(
          "/experiences/wunderman-thompson-commerce",
          BASE_URL,
        ).toString();
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: new URL(
          "/experiences/wunderman-thompson-commerce",
          BASE_URL,
        ).toString(),
        zh: new URL(
          "/zh/experiences/wunderman-thompson-commerce",
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
        type="experience"
        title="Wunderman Thompson Commerce"
        role={t({ en: "Front End Developer", zh: "前端开发员" })}
        date={t({ en: "Sep 2017 - Jul 2019", zh: "2017年9月 - 2019年7月" })}
        dateTime="2017-09"
      />
      <p>
        {t({
          en: "At Wunderman Thompson Commerce, I played a crucial role in improving three high-traffic e-commerce websites for a variety of clients. My work in re-platforming and redesigning projects contributed to increased conversion rates. I seamlessly integrated with multiple scrum teams and even took on the responsibility of a front-end tech lead at one point. My primary tech stack during this time included:",
          zh: "在 Wunderman Thompson Commerce，我在改进三个高流量电子商务网站方面发挥了关键作用，这些网站服务于不同的客户。我的重平台和重新设计项目工作有助于提高转化率。我与多个敏捷团队无缝合作，甚至在某个时候担任了前端技术负责人的职责。那时我主要使用的技术栈包括：",
        })}
      </p>
      <ul>
        <li>React</li>
        <li>Redux</li>
        <li>Sass</li>
      </ul>
    </>
  );
}
