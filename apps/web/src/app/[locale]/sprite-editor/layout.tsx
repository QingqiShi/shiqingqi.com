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

  const title = t({
    en: "Sprite Editor | Qingqi Shi",
    zh: "像素编辑器 | 石清琪",
  });
  const description = t({
    en: "Slice sprite sheets, clean up pixels, and assemble animation frames in the browser.",
    zh: "在浏览器中切分精灵表、清理像素并组装动画帧。",
  });
  const url =
    params.locale === "zh"
      ? new URL("/zh/sprite-editor", BASE_URL).toString()
      : new URL("/sprite-editor", BASE_URL).toString();

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: new URL("/sprite-editor", BASE_URL).toString(),
        zh: new URL("/zh/sprite-editor", BASE_URL).toString(),
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
    paddingBlockStart: `calc(${space._10} + env(safe-area-inset-top))`,
    paddingBlockEnd: `calc(${space._3} + env(safe-area-inset-bottom))`,
    paddingInline: space._3,
    minHeight: "100dvh",
    boxSizing: "border-box",
  },
});
