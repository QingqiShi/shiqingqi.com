import type { Metadata } from "next";
import { PixelGallery } from "#src/components/pixel-creature-creator/pixel-gallery.tsx";
import { t } from "#src/i18n.ts";

// Unlinked playground route — keep crawlers and AI scrapers out.
export function generateMetadata(): Metadata {
  return {
    title: t({ en: "Pixel gallery", zh: "像素画廊" }),
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// `?paused=1` freezes the canonical-row sprites at their t=0 pose. The
// Playwright visual fixture sets it so screenshots are deterministic;
// regular browser visitors still see the live animation.
export default async function Page({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const rawPaused = Array.isArray(resolved.paused)
    ? resolved.paused[0]
    : resolved.paused;
  const paused = rawPaused === "1" || rawPaused === "true";
  return <PixelGallery pausedCanonicalRow={paused} />;
}
