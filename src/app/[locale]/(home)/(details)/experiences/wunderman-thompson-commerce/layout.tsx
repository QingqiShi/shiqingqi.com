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
      en: "Front-End Developer at Wunderman Thompson Commerce - Enhancing E-commerce Websites",
      zh: "Wunderman Thompson Commerce 的前端开发人员 - 提升电子商务网站体验",
    }),
    description: t({
      en: "Explore Qingqi Shi's role as a front-end developer at Wunderman Thompson Commerce, where he enhanced e-commerce websites and took on tech lead responsibilities.",
      zh: "探讨石清琪在 Wunderman Thompson Commerce 担任前端开发人员的角色，他在提升电子商务网站体验和承担技术负责人职责方面发挥了关键作用。",
    }),
    alternates: {
      canonical: new URL(
        "/experiences/wunderman-thompson-commerce",
        BASE_URL,
      ).toString(),
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
