import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import { controlSize, space } from "#src/tokens.stylex.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  validateLocale(params.locale);

  const title = t({
    en: "Component Library | Qingqi Shi",
    zh: "组件库 | 石清琪",
  });
  const description = t({
    en: "Explore Qingqi Shi's component library - a collection of beautiful, reusable components crafted with care for modern web applications.",
    zh: "探索石清琪的组件库 - 为现代网页应用精心打造的精美、可重用组件集合。",
  });
  const url =
    params.locale === "zh"
      ? new URL("/zh/component-library", BASE_URL).toString()
      : new URL("/component-library", BASE_URL).toString();

  return {
    title: {
      default: title,
      template: t({
        en: "%s | Component Library | Qingqi Shi",
        zh: "%s | 组件库 | 石清琪",
      }),
    },
    description,
    alternates: {
      canonical: new URL("/component-library", BASE_URL).toString(),
      languages: {
        en: new URL("/component-library", BASE_URL).toString(),
        zh: new URL("/zh/component-library", BASE_URL).toString(),
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

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div css={styles.container}>
      <main css={styles.main}>{children}</main>
    </div>
  );
}

const styles = stylex.create({
  container: {
    maxInlineSize: "1140px",
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  main: {
    paddingTop: {
      default: `calc(${space._10} + env(safe-area-inset-top) + ${controlSize._9} + ${space._3})`,
    },
  },
});
