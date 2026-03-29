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
import { space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
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

  // Validate type
  if (type !== "movie" && type !== "tv") {
    notFound();
  }

  if (type === "movie") {
    const movieDetails = await getMovieDetails({
      movie_id: id,
      language: validatedLocale,
    });
    const title =
      movieDetails.title ??
      movieDetails.original_title ??
      t({ en: "Untitled", zh: "佚名" });
    const description = movieDetails.overview || movieDetails.tagline;
    const url =
      locale === "zh"
        ? new URL(`/zh/movie-database/movie/${id}`, BASE_URL).toString()
        : new URL(`/movie-database/movie/${id}`, BASE_URL).toString();

    return {
      title,
      description,
      alternates: {
        canonical: new URL(`/movie-database/movie/${id}`, BASE_URL).toString(),
        languages: {
          en: new URL(`/movie-database/movie/${id}`, BASE_URL).toString(),
          zh: new URL(`/zh/movie-database/movie/${id}`, BASE_URL).toString(),
        },
      },
      openGraph: {
        title,
        description: description ?? undefined,
        url,
        siteName: t({ en: "Qingqi Shi", zh: "石清琪" }),
        locale: locale === "zh" ? "zh_CN" : "en_US",
        type: "website",
        images: buildOgImages(movieDetails.backdrop_path, title),
      },
      twitter: {
        card: movieDetails.backdrop_path ? "summary_large_image" : "summary",
        title,
        description: description ?? undefined,
        images: movieDetails.backdrop_path
          ? [`${TMDB_IMAGE_BASE}w1280${movieDetails.backdrop_path}`]
          : undefined,
      },
    } satisfies Metadata;
  } else {
    const tvShowDetails = await getTvShowDetails({
      series_id: id,
      language: validatedLocale,
    });
    const title =
      tvShowDetails.name ??
      tvShowDetails.original_name ??
      t({ en: "Untitled", zh: "佚名" });
    const description = tvShowDetails.overview || tvShowDetails.tagline;
    const url =
      locale === "zh"
        ? new URL(`/zh/movie-database/tv/${id}`, BASE_URL).toString()
        : new URL(`/movie-database/tv/${id}`, BASE_URL).toString();

    return {
      title,
      description,
      alternates: {
        canonical: new URL(`/movie-database/tv/${id}`, BASE_URL).toString(),
        languages: {
          en: new URL(`/movie-database/tv/${id}`, BASE_URL).toString(),
          zh: new URL(`/zh/movie-database/tv/${id}`, BASE_URL).toString(),
        },
      },
      openGraph: {
        title,
        description: description ?? undefined,
        url,
        siteName: t({ en: "Qingqi Shi", zh: "石清琪" }),
        locale: locale === "zh" ? "zh_CN" : "en_US",
        type: "website",
        images: buildOgImages(tvShowDetails.backdrop_path, title),
      },
      twitter: {
        card: tvShowDetails.backdrop_path ? "summary_large_image" : "summary",
        title,
        description: description ?? undefined,
        images: tvShowDetails.backdrop_path
          ? [`${TMDB_IMAGE_BASE}w1280${tvShowDetails.backdrop_path}`]
          : undefined,
      },
    } satisfies Metadata;
  }
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
    maxInlineSize: "1140px",
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
