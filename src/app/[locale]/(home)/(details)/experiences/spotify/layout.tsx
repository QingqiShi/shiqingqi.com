import type { Metadata } from "next";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  validateLocale(params.locale);
  return {
    title: t({
      en: "Software Engineer II at Spotify - Developing Innovative Campaign Management Solutions",
      zh: "Spotify 的软件工程师 II - 开发创新的广告活动管理解决方案",
    }),
    description: t({
      en: "Learn about Qingqi Shi's experience as a Software Engineer II at Spotify, where he built a campaign management platform and contributed to company-wide initiatives.",
      zh: "了解石清琪在 Spotify 担任软件工程师 II 的经验，他构建了一个广告活动管理平台，并为公司范围内的一些项目做出了贡献。",
    }),
    alternates: {
      canonical: new URL("/experiences/spotify", BASE_URL).toString(),
      languages: {
        en: new URL("/experiences/spotify", BASE_URL).toString(),
        zh: new URL("/zh/experiences/spotify", BASE_URL).toString(),
      },
    },
  } satisfies Metadata;
}

export default function Layout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return children;
}
