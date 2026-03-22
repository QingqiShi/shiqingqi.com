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
      en: "Education at University of Bristol",
      zh: "布里斯托大学 教育",
    }),
    description: t({
      en: "Qingqi graduated from the University of Bristol with a Merit in MSc Advanced Computing - Creative Technology.",
      zh: "石清琪毕业于布里斯托大学，取得了《高级计算机 创新技术》理学硕士。",
    }),
    alternates: {
      canonical: new URL(
        "/education/university-of-bristol",
        BASE_URL,
      ).toString(),
      languages: {
        en: new URL("/education/university-of-bristol", BASE_URL).toString(),
        zh: new URL("/zh/education/university-of-bristol", BASE_URL).toString(),
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
