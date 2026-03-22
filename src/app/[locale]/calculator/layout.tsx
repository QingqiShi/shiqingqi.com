import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import { space } from "#src/tokens.stylex.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  validateLocale(params.locale);
  return {
    title: t({ en: "Calculator | Qingqi Shi", zh: "计算器 | 石清琪" }),
    description: t({
      en: "Qingqi's simple calculator demo.",
      zh: "一个简单的计算器演示",
    }),
    alternates: {
      canonical: new URL("/calculator", BASE_URL).toString(),
      languages: {
        en: new URL("/calculator", BASE_URL).toString(),
        zh: new URL("/zh/calculator", BASE_URL).toString(),
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
  return <div css={styles.container}>{children}</div>;
}

const styles = stylex.create({
  container: {
    padding: space._3,
    paddingTop: `calc(${space._10} + env(safe-area-inset-top))`,
    paddingBottom: `calc(${space._3} + env(safe-area-inset-bottom))`,
    height: "100dvh",
    display: "grid",
    justifyContent: "center",
    alignItems: "center",
  },
});
