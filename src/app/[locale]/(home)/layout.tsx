import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { BackgroundLines } from "#src/components/home/background-lines.tsx";
import { Footer } from "#src/components/home/footer.tsx";
import { FlowGradient } from "#src/components/shared/flow-gradient/flow-gradient.tsx";
import { BASE_URL } from "#src/constants.ts";
import { i18nConfig } from "#src/i18n-config.ts";
import { t } from "#src/i18n.ts";
import { color, layer, layout, space } from "#src/tokens.stylex.ts";
import type { PageProps, SupportedLocale } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { glowTokens } from "./layout.stylex";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  validateLocale(params.locale);

  const title = t({ en: "Qingqi Shi", zh: "石清琪" });
  const description = t({
    en: "Explore the personal website of Qingqi Shi, a software engineer who values the craftsman's spirit and specializes in React, TypeScript, and web development. Discover his professional experiences, technical skills, and educational background.",
    zh: "探索石清琪的个人网站，他是一位信奉匠人精神并擅长 React、TypeScript 和 Web 开发的软件工程师。了解他的职业经历、技术技能和教育背景。",
  });
  const url =
    params.locale === "zh"
      ? new URL("/zh", BASE_URL).toString()
      : new URL("/", BASE_URL).toString();

  return {
    title: {
      default: title,
      template: t({ en: "%s | Qingqi Shi", zh: "%s | 石清琪" }),
    },
    description,
    applicationName: t({ en: "Qingqi Shi", zh: "石清琪" }),
    alternates: {
      canonical: new URL("/", BASE_URL).toString(),
      languages: {
        en: new URL("/", BASE_URL).toString(),
        zh: new URL("/zh", BASE_URL).toString(),
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

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);

  if (!i18nConfig.locales.includes(validatedLocale)) {
    notFound();
  }

  const jsonLd = buildHomeJsonLd(validatedLocale);

  return (
    <>
      {/* eslint-disable @eslint-react/dom-no-dangerously-set-innerhtml -- JSON-LD must be emitted inline; the payload is escaped in buildHomeJsonLd */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      {/* eslint-enable @eslint-react/dom-no-dangerously-set-innerhtml */}
      <div css={styles.flowGradient} role="presentation">
        <Suspense fallback={null}>
          <ErrorBoundary fallback={null}>
            <FlowGradient />
          </ErrorBoundary>
        </Suspense>
      </div>
      <div css={styles.glow} role="presentation" />
      <div css={styles.container}>
        <div css={styles.wrapperInner}>
          <BackgroundLines />
          <main css={styles.main}>{children}</main>
          <Footer locale={validatedLocale} />
        </div>
      </div>
    </>
  );
}

/**
 * Build the schema.org JSON-LD block for the portfolio home. Returns a
 * `@graph` with a single `Person` identity (anchored by a stable `@id` so
 * the EN and ZH pages reference the same entity) and a `WebSite` node that
 * points back to that Person as its `author`. The string is escaped so a
 * `</script>` substring in any future field value cannot break out of the
 * inline script.
 */
function buildHomeJsonLd(locale: SupportedLocale) {
  const personId = `${BASE_URL}/#person`;
  const websiteId = `${BASE_URL}/#website`;
  const primaryName = locale === "zh" ? "石清琪" : "Qingqi Shi";
  const alternateName = locale === "zh" ? "Qingqi Shi" : "石清琪";
  const linkedInUrl =
    locale === "zh"
      ? "https://www.linkedin.com/in/qingqi-shi/?locale=zh_CN"
      : "https://www.linkedin.com/in/qingqi-shi/";

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        name: primaryName,
        alternateName,
        url: BASE_URL,
        jobTitle: locale === "zh" ? "软件工程师" : "Software Engineer",
        sameAs: ["https://github.com/QingqiShi", linkedInUrl],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: BASE_URL,
        name: primaryName,
        inLanguage: locale === "zh" ? "zh-CN" : "en",
        author: { "@id": personId },
      },
    ],
  };

  return JSON.stringify(graph).replace(/</g, "\\u003c");
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
  wrapperInner: {
    position: "relative",
  },
  main: {},
  flowGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: layer.base,
    height: {
      default: space._15,
      [breakpoints.md]: space._16,
      [breakpoints.lg]: space._15,
      [breakpoints.xl]: `max(${space._15}, 80dvh)`,
    },
  },
  glow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: layer.base,
    overflow: "hidden",
    pointerEvents: "none",
    backgroundImage: `radial-gradient(circle calc(${glowTokens.height}*5) at center calc(${glowTokens.height}*5), ${color.controlActive} calc(${glowTokens.height}*4), transparent)`,
    opacity: color.opacityActive,
    height: glowTokens.height,
  },
});
