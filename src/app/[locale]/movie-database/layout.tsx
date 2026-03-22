import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { Providers } from "#src/components/shared/providers.tsx";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import { space } from "#src/tokens.stylex.ts";
import type { PageProps } from "#src/types.ts";

export function generateMetadata(_props: PageProps): Metadata {
  return {
    title: {
      default: t({
        en: "Movie Database | Qingqi Shi",
        zh: "影视数据库 | 石清琪",
      }),
      template: t({
        en: "%s | Movie Database | Qingqi Shi",
        zh: "%s | 影视数据库 | 石清琪",
      }),
    },
    description: t({
      en: "Qingqi's Movie Database (QMDB) is a tool to help you find ratings and reviews for the newest movie and TV shows.",
      zh: "石清琪的影视数据库 (QMDB) 是一个帮助您查找最新电影和电视剧评分与影评的工具。",
    }),
    alternates: {
      canonical: new URL("/movie-database", BASE_URL).toString(),
      languages: {
        en: new URL("/movie-database", BASE_URL).toString(),
        zh: new URL("/zh/movie-database", BASE_URL).toString(),
      },
    },
  } satisfies Metadata;
}

export default function Layout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return (
    <Providers>
      <div css={styles.container}>{children}</div>
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
