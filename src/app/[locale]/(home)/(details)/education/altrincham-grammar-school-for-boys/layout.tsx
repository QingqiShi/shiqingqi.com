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

export default function Layout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return children;
}
