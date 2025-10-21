import { getConfiguration } from "@/_generated/tmdb-server-functions";
import type { SupportedLocale } from "@/types";

interface BackdropImageProps {
  backdropPath: string;
  alt: string;
  locale: SupportedLocale;
}

/**
 * A component that renders a backdrop image with localization and responsive sizing.
 * If the required configuration is unavailable or the image fails to load, a fallback UI is displayed.
 * The component supports lazy loading and generates `srcSet` for responsive image handling.
 */
export async function BackdropImage({ backdropPath, alt }: BackdropImageProps) {
  const config = await getConfiguration();

  if (!config.images?.base_url || !config.images?.backdrop_sizes) {
    return null;
  }

  const sizes = config.images.backdrop_sizes
    .filter((size) => size.startsWith("w"))
    .map((size) => Number(size.replace("w", "")));

  const src = `${config.images?.secure_base_url}w${sizes[sizes.length - 1]}${backdropPath}`;
  const srcSet = sizes
    .map(
      (size) =>
        `${config.images?.secure_base_url}w${size}${backdropPath} ${size}w`,
    )
    .join(", ");

  return (
    <div className="absolute top-0 left-0 z-background overflow-hidden w-full">
      {/* Disabling no-img-element rule as the images here are from a third party provider and is already
      optimized */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="w-[100dvw] min-h-[calc(96px+64px)] xl:max-h-[calc(50dvh+80px)] aspect-[21/9] relative object-cover object-center"
        alt={alt}
        src={src}
        srcSet={srcSet}
        sizes="100vw"
      />

      <div
        role="presentation"
        className="absolute top-0 left-0 w-full h-full z-base bg-[radial-gradient(farthest-side_at_73%_21%,transparent,theme(colors.gray.1))] dark:bg-[radial-gradient(farthest-side_at_73%_21%,transparent,theme(colors.grayDark.1))]"
      />
      <div
        role="presentation"
        className="absolute left-0 z-base w-full top-[96px] h-0 lg:top-[calc(32px+clamp(96px,30dvw,30dvh))] lg:h-[calc(100%-32px-clamp(96px,30dvw,30dvh))] xl:top-[calc(32px+min(80px,30dvh))] xl:h-[calc(100%-32px-min(80px,20dvh))] bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_0%,rgba(255,255,255,0.013)_8.1%,rgba(255,255,255,0.049)_15.5%,rgba(255,255,255,0.104)_22.4%,rgba(255,255,255,0.175)_28.9%,rgba(255,255,255,0.259)_35%,rgba(255,255,255,0.352)_41%,rgba(255,255,255,0.45)_46.7%,rgba(255,255,255,0.55)_52.5%,rgba(255,255,255,0.648)_58.3%,rgba(255,255,255,0.741)_64.3%,rgba(255,255,255,0.825)_70.5%,rgba(255,255,255,0.896)_77.1%,rgba(255,255,255,0.951)_84.2%,rgba(255,255,255,0.987)_91.8%,rgb(255,255,255)_100%)] dark:bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_0%,rgba(0,0,0,0.013)_8.1%,rgba(0,0,0,0.049)_15.5%,rgba(0,0,0,0.104)_22.4%,rgba(0,0,0,0.175)_28.9%,rgba(0,0,0,0.259)_35%,rgba(0,0,0,0.352)_41%,rgba(0,0,0,0.45)_46.7%,rgba(0,0,0,0.55)_52.5%,rgba(0,0,0,0.648)_58.3%,rgba(0,0,0,0.741)_64.3%,rgba(0,0,0,0.825)_70.5%,rgba(0,0,0,0.896)_77.1%,rgba(0,0,0,0.951)_84.2%,rgba(0,0,0,0.987)_91.8%,rgb(0,0,0)_100%)]"
      />
    </div>
  );
}
