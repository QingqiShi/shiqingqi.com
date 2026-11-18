import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import type { StyleProp } from "@tuja/ui/types";

interface TripsLogoProps {
  css?: StyleProp;
}

const PIN =
  "M269.5 228.9A80 80 0 1 1 389.5 228.9L329.5 297ZM329.5 149A27 27 0 1 0 329.5 203A27 27 0 1 0 329.5 149Z";

/**
 * The Trips mark: a route of dots from a start to a map pin. The icons in
 * `public` draw the same mark, dark on every device; this one takes the
 * colours of the theme, so that it shows on the dark sidebar too.
 */
export function TripsLogo({ css }: TripsLogoProps) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" css={css}>
      <rect width="512" height="512" rx="115.2" css={styles.tile} />
      <g css={styles.mark}>
        <path fillRule="evenodd" d={PIN} />
        <circle cx="288.5" cy="264.5" r="10" />
        <circle cx="245.5" cy="276" r="10" />
        <circle cx="201.5" cy="281" r="10" />
        <circle cx="158.5" cy="288.5" r="10" />
        <circle cx="122.5" cy="313" r="10" />
        <circle cx="119" cy="354.5" r="10" />
        <circle cx="151.5" cy="383.5" r="30" />
      </g>
    </svg>
  );
}

const styles = stylex.create({
  tile: {
    fill: color.foreground,
  },
  mark: {
    fill: color.background,
  },
});
