import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { AIChatProvider } from "#src/ai-chat/ai-chat-context.tsx";
import { InlineChatProvider } from "#src/components/movie-database/inline-chat-context.tsx";
import { Providers } from "#src/components/shared/providers.tsx";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import { space } from "#src/tokens.stylex.ts";
import type { PageProps, SupportedLocale } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;

  const title = t({
    en: "Movie Database | Qingqi Shi",
    zh: "影视数据库 | 石清琪",
  });
  const description = t({
    en: "Qingqi's Movie Database (QMDB) is a tool to help you find ratings and reviews for the newest movie and TV shows.",
    zh: "石清琪的影视数据库 (QMDB) 是一个帮助您查找最新电影和电视剧评分与影评的工具。",
  });
  const url =
    params.locale === "zh"
      ? new URL("/zh/movie-database", BASE_URL).toString()
      : new URL("/movie-database", BASE_URL).toString();

  return {
    title: {
      default: title,
      template: t({
        en: "%s | Movie Database | Qingqi Shi",
        zh: "%s | 影视数据库 | 石清琪",
      }),
    },
    description,
    alternates: {
      canonical: new URL("/movie-database", BASE_URL).toString(),
      languages: {
        en: new URL("/movie-database", BASE_URL).toString(),
        zh: new URL("/zh/movie-database", BASE_URL).toString(),
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
  return (
    <Providers>
      <AIChatProvider locale={validatedLocale}>
        <InlineChatProvider>
          <div css={styles.container}>{children}</div>
        </InlineChatProvider>
      </AIChatProvider>
    </Providers>
  );
}

const styles = stylex.create({
  container: {
    paddingTop: {
      default: `calc(${space._10} + env(safe-area-inset-top))`,
    },
  },
});
