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

  const title = t({ en: "Calculator | Qingqi Shi", zh: "计算器 | 石清琪" });
  const description = t({
    en: "Qingqi's simple calculator demo.",
    zh: "一个简单的计算器演示",
  });
  const url =
    params.locale === "zh"
      ? new URL("/zh/calculator", BASE_URL).toString()
      : new URL("/calculator", BASE_URL).toString();

  return {
    title,
    description,
    alternates: {
      canonical: new URL("/calculator", BASE_URL).toString(),
      languages: {
        en: new URL("/calculator", BASE_URL).toString(),
        zh: new URL("/zh/calculator", BASE_URL).toString(),
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: t({ en: "Qingqi Shi", zh: "石清琪" }),
      locale: params.locale === "zh" ? "zh_CN" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  } satisfies Metadata;
}

export default function Layout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return <main css={styles.container}>{children}</main>;
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
