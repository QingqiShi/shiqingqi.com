import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { ErrorBoundary } from "react-error-boundary";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import { color, space } from "#src/tokens.stylex.ts";

export function generateMetadata(_props: {
  params: Promise<{ locale: string }>;
}): Metadata {
  return {
    title: t({ en: "AI Mode", zh: "AI 模式" }),
    description: t({
      en: "Chat with AI about movies and TV shows",
      zh: "与 AI 聊电影和电视剧",
    }),
    alternates: {
      canonical: new URL("/movie-database/ai-mode", BASE_URL).toString(),
      languages: {
        en: new URL("/movie-database/ai-mode", BASE_URL).toString(),
        zh: new URL("/zh/movie-database/ai-mode", BASE_URL).toString(),
      },
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
    fontSize: "18px",
    color: color.textMuted,
    margin: 0,
  },
});
