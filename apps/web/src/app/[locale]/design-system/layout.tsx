import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import { controlSize, layout, space } from "#src/tokens.stylex.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  validateLocale(params.locale);

  const title = t({
    en: "Design System | Qingqi Shi",
    zh: "设计系统 | 石清琪",
  });
  const description = t({
    en: "Explore Qingqi Shi's design system - tokens, primitives, and components that power a refined visual language across modern web applications.",
    zh: "探索石清琪的设计系统 — 为现代网页应用提供精致视觉语言的设计令牌、原语与组件。",
  });
  const url =
    params.locale === "zh"
      ? new URL("/zh/design-system", BASE_URL).toString()
      : new URL("/design-system", BASE_URL).toString();

  return {
    title: {
      default: title,
      template: t({
        en: "%s | Design System | Qingqi Shi",
        zh: "%s | 设计系统 | 石清琪",
      }),
    },
    description,
    alternates: {
      canonical: url,
      languages: {
        en: new URL("/design-system", BASE_URL).toString(),
        zh: new URL("/zh/design-system", BASE_URL).toString(),
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
    maxInlineSize: layout.maxInlineSize,
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
