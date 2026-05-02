import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import Link from "next/link";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { FeaturedRow } from "#src/components/pixel-creature-creator/landing/featured-row.tsx";
import { YourCreations } from "#src/components/pixel-creature-creator/landing/your-creations.tsx";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  validateLocale(params.locale);
  const title = t({
    en: "Pixel Creature Creator | Qingqi Shi",
    zh: "像素生物创造器 | 石清琪",
  });
  const description = t({
    en: "Build a tiny pixel creature, name it, and conjure its lore.",
    zh: "搭建一个小像素生物，给它取名，并召唤它的传说。",
  });
  const url =
    params.locale === "zh"
      ? new URL("/zh/pixel-creature-creator", BASE_URL).toString()
      : new URL("/pixel-creature-creator", BASE_URL).toString();
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: new URL("/pixel-creature-creator", BASE_URL).toString(),
        zh: new URL("/zh/pixel-creature-creator", BASE_URL).toString(),
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
      card: "summary_large_image",
      title,
      description,
    },
  } satisfies Metadata;
}

export default async function Page(props: PageProps) {
  const { locale } = await props.params;
  const localePrefix = locale === "en" ? "/en" : "/zh";
  const createHref = `${localePrefix}/pixel-creature-creator/create`;
  return (
    <div css={styles.root}>
      <section css={styles.hero}>
        <h1 css={styles.title}>
          {t({ en: "Pixel Creature Creator", zh: "像素生物创造器" })}
        </h1>
        <p css={styles.subtitle}>
          {t({
            en: "Build a tiny pixel creature, name it, and conjure its lore.",
            zh: "搭建一个小像素生物，给它取名，并召唤它的传说。",
          })}
        </p>
        <Link href={createHref} css={styles.cta} data-testid="landing-cta">
          {t({ en: "Start creating", zh: "开始创造" })}
        </Link>
      </section>

      <FeaturedRow locale={locale} />

      <YourCreations locale={locale} />
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space._9,
    paddingBlock: {
      default: space._7,
      [breakpoints.md]: space._9,
    },
    paddingInline: space._4,
    maxInlineSize: "1080px",
    marginInline: "auto",
    width: "100%",
    boxSizing: "border-box",
  },
  hero: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    alignItems: "flex-start",
    paddingBlockStart: `clamp(${space._7}, 12dvh, ${space._12})`,
  },
  title: {
    margin: 0,
    fontSize: font.vpDisplay,
    fontWeight: font.weight_8,
    color: color.textMain,
  },
  subtitle: {
    margin: 0,
    fontSize: font.vpSubDisplay,
    color: color.textMuted,
    maxInlineSize: "42rem",
  },
  cta: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    paddingBlock: space._3,
    paddingInline: space._6,
    backgroundColor: {
      default: color.brandPixelCreatureCreator,
      ":hover": color.controlActive,
      ":focus-visible": color.controlActive,
    },
    color: color.textOnActive,
    borderRadius: "999px",
    fontSize: font.uiBody,
    fontWeight: font.weight_7,
    textDecoration: "none",
    transitionProperty: "background-color, transform",
    transitionDuration: "120ms",
    outlineOffset: "2px",
    marginBlockStart: space._2,
  },
});
