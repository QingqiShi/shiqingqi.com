import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { DotGridBackground } from "#src/components/ai-chat/dot-grid-background.tsx";
import { RetryableErrorBoundary } from "#src/components/shared/retryable-error-boundary.tsx";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import { layout, space } from "#src/tokens.stylex.ts";

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
    <RetryableErrorBoundary
      message={t({
        en: "Something went wrong.",
        zh: "出错了。",
      })}
    >
      <DotGridBackground />
      <main css={styles.container}>{children}</main>
    </RetryableErrorBoundary>
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: `calc(100dvh - ${space._10} - env(safe-area-inset-top))`,
    maxInlineSize: layout.maxInlineSize,
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
  },
});
