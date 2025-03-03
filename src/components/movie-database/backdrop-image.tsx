import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";
import { color, layer, ratio, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { fetchConfiguration } from "@/utils/tmdb-api";

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
  const config = await fetchConfiguration();

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
        `${config.images?.secure_base_url}w${size}${backdropPath} ${size}w`
    )
    .join(", ");

  return (
    <div css={styles.container}>
      {/* Disabling no-img-element rule as the images here are from a third party provider and is already 
      optimized */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        css={styles.image}
        alt={alt}
        src={src}
        srcSet={srcSet}
        sizes="100vw"
        loading="lazy"
      />

      <div role="presentation" css={styles.mask1} />
      <div role="presentation" css={styles.mask2} />
    </div>
  );
}

const styles = stylex.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: layer.background,
    overflow: "hidden",
    width: "100%",
  },
  mask1: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: layer.base,
    background: `radial-gradient(farthest-side at 73% 21%, transparent, ${color.backgroundMain})`,
  },
  mask2: {
    position: "absolute",
    left: 0,
    zIndex: layer.base,
    width: "100%",
    top: {
      default: space._12,
      [breakpoints.lg]: `calc(${space._8} + clamp(${space._12}, 30dvw, 30dvh))`,
      [breakpoints.xl]: `calc(${space._8} + min(${space._13}, 30dvh))`,
    },
    height: {
      default: 0,
      [breakpoints.lg]: `calc(100% - ${space._8} - clamp(${space._12}, 30dvw, 30dvh))`,
      [breakpoints.xl]: `calc(100% - ${space._8} - min(${space._13}, 20dvh))`,
    },
    // https://larsenwork.com/easing-gradients/
    background: `linear-gradient(
      to bottom,
      rgba(${color.backgroundMainChannels}, 0) 0%,
      rgba(${color.backgroundMainChannels}, 0.013) 8.1%,
      rgba(${color.backgroundMainChannels}, 0.049) 15.5%,
      rgba(${color.backgroundMainChannels}, 0.104) 22.4%,
      rgba(${color.backgroundMainChannels}, 0.175) 28.9%,
      rgba(${color.backgroundMainChannels}, 0.259) 35%,
      rgba(${color.backgroundMainChannels}, 0.352) 41%,
      rgba(${color.backgroundMainChannels}, 0.45) 46.7%,
      rgba(${color.backgroundMainChannels}, 0.55) 52.5%,
      rgba(${color.backgroundMainChannels}, 0.648) 58.3%,
      rgba(${color.backgroundMainChannels}, 0.741) 64.3%,
      rgba(${color.backgroundMainChannels}, 0.825) 70.5%,
      rgba(${color.backgroundMainChannels}, 0.896) 77.1%,
      rgba(${color.backgroundMainChannels}, 0.951) 84.2%,
      rgba(${color.backgroundMainChannels}, 0.987) 91.8%,
      rgb(${color.backgroundMainChannels}) 100%
    )`,
  },
  image: {
    width: "100dvw",
    minHeight: `calc(${space._14} + ${space._11})`,
    maxHeight: {
      default: null,
      [breakpoints.xl]: `calc(50dvh + ${space._13})`,
    },
    aspectRatio: ratio.wide,
    position: "relative",
    objectFit: "cover",
    objectPosition: "center center",
  },
});
