import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { ErrorBoundary } from "react-error-boundary";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;

  const title = t({ en: "AI Mode", zh: "AI 模式" });
  const description = t({
    en: "Chat with AI about movies and TV shows",
    zh: "与 AI 聊电影和电视剧",
  });
  const url =
    locale === "zh"
      ? new URL("/zh/movie-database/ai-mode", BASE_URL).toString()
      : new URL("/movie-database/ai-mode", BASE_URL).toString();

  return {
    title,
    description,
    alternates: {
      canonical: new URL("/movie-database/ai-mode", BASE_URL).toString(),
      languages: {
        en: new URL("/movie-database/ai-mode", BASE_URL).toString(),
        zh: new URL("/zh/movie-database/ai-mode", BASE_URL).toString(),
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: t({ en: "Qingqi Shi", zh: "石清琪" }),
      locale: locale === "zh" ? "zh_CN" : "en_US",
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
    <ErrorBoundary
      fallback={
        <div css={styles.errorContainer}>
          <p css={styles.errorText}>
            {t({
              en: "Something went wrong. Please try again.",
              zh: "出错了，请重试。",
            })}
          </p>
        </div>
      }
    >
      <main css={styles.container}>{children}</main>
    </ErrorBoundary>
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: `calc(100dvh - ${space._10} - env(safe-area-inset-top))`,
    maxInlineSize: "1140px",
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  errorContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    padding: space._6,
  },
  errorText: {
    fontSize: font.uiHeading3,
    color: color.textMuted,
    margin: 0,
  },
});
