import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { absoluteFill } from "@tuja/ui/primitives/layout.stylex";
import { color, layer, ratio, space } from "@tuja/ui/tokens.stylex";
import { getConfiguration } from "#src/_generated/tmdb-server-functions.ts";
import { buildSrcSet } from "#src/utils/tmdb-image.ts";

interface BackdropImageProps {
  backdropPath: string;
}

/**
 * A component that renders a backdrop image with responsive sizing.
 * If the required configuration is unavailable, nothing is rendered.
 * The component generates `srcSet` for responsive image handling.
 *
 * The backdrop is purely decorative reinforcement of the adjacent heading,
 * so the `<img>` carries `alt=""` (WAI-ARIA 1.2 decorative-image pattern).
 */
export async function BackdropImage({ backdropPath }: BackdropImageProps) {
  const config = await getConfiguration();

  if (!config.images?.base_url || !config.images.backdrop_sizes) {
    return null;
  }

  const { src, srcSet } = buildSrcSet(
    config.images.secure_base_url ?? config.images.base_url,
    config.images.backdrop_sizes,
    backdropPath,
  );

  return (
    <div css={styles.container}>
      {/* Disabling no-img-element rule as the images here are from a third party provider and is already 
      optimized */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        css={styles.image}
        alt=""
        src={src}
        srcSet={srcSet}
        sizes="100vw"
        fetchPriority="high"
        decoding="async"
      />

      <div role="presentation" css={[absoluteFill.all, styles.mask1]} />
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
    zIndex: layer.base,
    backgroundImage: `radial-gradient(farthest-side at 73% 21%, transparent, ${color.bgCanvas})`,
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
    backgroundImage: `linear-gradient(
      to bottom,
      transparent 0%,
      color-mix(in srgb, ${color.bgCanvasFade} 1.3%, transparent) 8.1%,
      color-mix(in srgb, ${color.bgCanvasFade} 4.9%, transparent) 15.5%,
      color-mix(in srgb, ${color.bgCanvasFade} 10.4%, transparent) 22.4%,
      color-mix(in srgb, ${color.bgCanvasFade} 17.5%, transparent) 28.9%,
      color-mix(in srgb, ${color.bgCanvasFade} 25.9%, transparent) 35%,
      color-mix(in srgb, ${color.bgCanvasFade} 35.2%, transparent) 41%,
      color-mix(in srgb, ${color.bgCanvasFade} 45%, transparent) 46.7%,
      color-mix(in srgb, ${color.bgCanvasFade} 55%, transparent) 52.5%,
      color-mix(in srgb, ${color.bgCanvasFade} 64.8%, transparent) 58.3%,
      color-mix(in srgb, ${color.bgCanvasFade} 74.1%, transparent) 64.3%,
      color-mix(in srgb, ${color.bgCanvasFade} 82.5%, transparent) 70.5%,
      color-mix(in srgb, ${color.bgCanvasFade} 89.6%, transparent) 77.1%,
      color-mix(in srgb, ${color.bgCanvasFade} 95.1%, transparent) 84.2%,
      color-mix(in srgb, ${color.bgCanvasFade} 98.7%, transparent) 91.8%,
      ${color.bgCanvasFade} 100%
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
