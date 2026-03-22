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
      en: "Software Engineer at Citadel - Crafting Dashboard Web Apps for the Financial Sector",
      zh: "Citadel 的软件工程师 - 为金融行业打造仪表盘Web应用",
    }),
    description: t({
      en: "Discover how Qingqi Shi, a software engineer at Citadel, develops dashboard web applications for the financial sector using React, TypeScript, and AG Grid.",
      zh: "了解石清琪在 Citadel 担任软件工程师的经历，他使用 React、TypeScript 和 AG Grid 为金融行业开发仪表盘 Web 应用。",
    }),
    alternates: {
      canonical: new URL("/experiences/citadel", BASE_URL).toString(),
      languages: {
        en: new URL("/experiences/citadel", BASE_URL).toString(),
        zh: new URL("/zh/experiences/citadel", BASE_URL).toString(),
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
