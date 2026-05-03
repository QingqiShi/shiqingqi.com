// Server entry for the review screen. Hosts the faux-Pokedex card and the
// action row beneath it; the heavy lifting lives in the client component.

import type { Metadata } from "next";
import { ReviewScreen } from "#src/components/pixel-creature-creator/review/review-screen.tsx";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  validateLocale(params.locale);
  const title = t({
    en: "Your creature | Qingqi Shi",
    zh: "你的生物 | 石清琪",
  });
  const description = t({
    en: "View and share a pixel creature you designed.",
    zh: "查看并分享你设计的像素生物。",
  });
  // The route itself is indexable, but the per-creature data lives in the
  // URL fragment which crawlers can't see — so search engines pick up the
  // shared shell only, not every variant. No `robots: { index: false }`
  // override here on purpose.
  const url =
    params.locale === "zh"
      ? new URL("/zh/pixel-creature-creator/c", BASE_URL).toString()
      : new URL("/pixel-creature-creator/c", BASE_URL).toString();
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: new URL("/pixel-creature-creator/c", BASE_URL).toString(),
        zh: new URL("/zh/pixel-creature-creator/c", BASE_URL).toString(),
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

interface ReviewPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: ReviewPageProps) {
  // `?paused=1` freezes the sprite at t=0 so the wizard E2E walk-through
  // can assert against a deterministic pose without flakiness.
  const resolved = await searchParams;
  const rawPaused = Array.isArray(resolved.paused)
    ? resolved.paused[0]
    : resolved.paused;
  const paused = rawPaused === "1" || rawPaused === "true";
  return <ReviewScreen paused={paused} />;
}
