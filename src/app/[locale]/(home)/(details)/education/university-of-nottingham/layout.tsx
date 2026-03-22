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
      en: "Education at University of Nottingham",
      zh: "诺丁汉大学 教育",
    }),
    description: t({
      en: "Qingqi graduated from the University of Nottingham with a First-class Honours degree in BSc Computer Science.",
      zh: "石清琪毕业于诺丁汉大学，取得了《计算机科学》荣誉理学学士。",
    }),
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
