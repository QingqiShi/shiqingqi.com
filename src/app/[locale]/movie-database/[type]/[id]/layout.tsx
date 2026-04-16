import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getMovieDetails,
  getTvShowDetails,
} from "#src/_generated/tmdb-server-functions.ts";
import { Footer } from "#src/components/home/footer.tsx";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import { layout, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import type { PageProps } from "./types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

function buildOgImages(backdropPath: string | null | undefined, title: string) {
  if (!backdropPath) return undefined;
  return [
    {
      url: `${TMDB_IMAGE_BASE}w1280${backdropPath}`,
      width: 1280,
      height: 720,
      alt: title,
    },
  ];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, type, id } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);

  if (type !== "movie" && type !== "tv") {
    notFound();
  }

  let title: string;
  let description: string | null | undefined;
  let backdropPath: string | null | undefined;

  if (type === "movie") {
    const details = await getMovieDetails({
      movie_id: id,
      language: validatedLocale,
    });
    title =
      details.title ??
      details.original_title ??
      t({ en: "Untitled", zh: "佚名" });
    description = details.overview || details.tagline;
    backdropPath = details.backdrop_path;
  } else {
    const details = await getTvShowDetails({
      series_id: id,
      language: validatedLocale,
    });
    title =
      details.name ??
      details.original_name ??
      t({ en: "Untitled", zh: "佚名" });
    description = details.overview || details.tagline;
    backdropPath = details.backdrop_path;
  }

  const basePath = `/movie-database/${type}/${id}`;
  const canonicalPath = new URL(basePath, BASE_URL).toString();
  const url = new URL(
    getLocalePath(basePath, validatedLocale),
    BASE_URL,
  ).toString();

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: canonicalPath,
        zh: new URL(getLocalePath(basePath, "zh"), BASE_URL).toString(),
      },
    },
    openGraph: {
      title,
      description: description ?? undefined,
      url,
      siteName: t({ en: "Qingqi Shi", zh: "石清琪" }),
      locale: validatedLocale === "zh" ? "zh_CN" : "en_US",
      type: "website",
      images: buildOgImages(backdropPath, title),
    },
    twitter: {
      card: backdropPath ? "summary_large_image" : "summary",
      title,
      description: description ?? undefined,
      images: backdropPath
        ? [`${TMDB_IMAGE_BASE}w1280${backdropPath}`]
        : undefined,
    },
  } satisfies Metadata;
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; type: string; id: string }>;
}) {
  const { locale } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);
  return (
    <>
      <main>{children}</main>
      <div css={styles.container}>
        <div css={styles.wrapperInner}>
          <Footer locale={validatedLocale} />
        </div>
      </div>
    </>
  );
}

const styles = stylex.create({
  container: {
    maxInlineSize: layout.maxInlineSize,
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    paddingLeft: `env(safe-area-inset-left)`,
    paddingRight: `env(safe-area-inset-right)`,
  },
  wrapperInner: {
    paddingInline: space._3,
  },
});
