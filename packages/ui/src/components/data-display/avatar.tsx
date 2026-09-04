import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { corner } from "../../primitives/corner.stylex.ts";
import type { StyleProp } from "../../style-prop.ts";
import { border, color, font, shadow, space } from "../../tokens.stylex.ts";

interface AvatarBaseProps extends Omit<
  ComponentProps<"span">,
  "children" | "role" | "aria-label" | "className" | "style"
> {
  /**
   * Who the avatar stands for, and the source of the derived monogram when
   * there is no `src` or `initials`. Keep it to the person — anything the
   * `badge` means belongs in `badgeLabel`.
   */
  name: string;
  /**
   * Portrait layered over the monogram; a URL that 404s just falls back to
   * it, so the caller needs no error handling. The portrait should be
   * opaque — a transparent pixel lets the monogram show through it too.
   */
  src?: string;
  /**
   * Overrides the derived monogram, e.g. when the derivation picks the wrong
   * characters or two would crowd. An empty string counts as no override.
   */
  initials?: string;
  /** Diameter and type scale. Defaults to `"md"`. */
  size?: "sm" | "md" | "lg";
  /**
   * `"subtle"` (the default) is a quiet tinted medallion for someone simply
   * present. `"solid"` inverts it, so the people a view is actually about
   * stand out of a row of their peers.
   */
  variant?: "subtle" | "solid";
  /** StyleX overrides merged over the root — composed last so a caller wins. */
  css?: StyleProp;
}

/**
 * The badge is drawn, so it needs no screen-reader text of its own.
 * `badgeLabel` is therefore required at the type level when `badge` is set,
 * and forbidden otherwise.
 */
type AvatarBadgeProps =
  | {
      /**
       * Corner marker — a status dot, a small icon. Drawn `aria-hidden`;
       * `badgeLabel` carries its meaning instead.
       */
      badge: ReactNode;
      /**
       * What the badge means, appended to the avatar's accessible name — the
       * package ships no i18n, so the consumer supplies the localized string.
       */
      badgeLabel: string;
    }
  | { badge?: undefined; badgeLabel?: undefined };

type AvatarProps = AvatarBaseProps & AvatarBadgeProps;

/** Array.from takes an astral-plane character whole, unlike string indexing. */
function monogramFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = Array.from(words[0])[0] ?? "";
  if (words.length === 1) return first;
  const last = Array.from(words[words.length - 1])[0] ?? "";
  return first + last;
}

/**
 * A circular medallion for one person: their portrait, or else a monogram
 * derived from their name, with an optional badge in the corner.
 */
export function Avatar({
  name,
  src,
  initials,
  size = "md",
  variant = "subtle",
  badge,
  badgeLabel,
  css,
  ...restProps
}: AvatarProps) {
  // `||`, not `??`: an empty `initials` string has no override to honour, so
  // it falls through to the derived monogram.
  const monogram = initials || monogramFrom(name);
  // Truthiness: `badge={person.isVerified && <CheckIcon />}` yields `false`
  // when absent, which `!= null` would wrongly call present.
  const hasBadge = Boolean(badge);
  // Space-separated rather than punctuated: the separator would have to be
  // localized, and screen readers already pause between the two runs.
  const label =
    hasBadge && badgeLabel !== undefined ? `${name} ${badgeLabel}` : name;
  const isNamed = label.trim() !== "";
  // `role="img"` tracks whether anything is drawn, not just whether `name` is
  // set. An empty span drops the role; a drawn one keeps it, since an unnamed
  // image fails WCAG 1.1.1.
  const isDrawn = src !== undefined || monogram !== "";
  const isImage = isNamed || isDrawn;

  return (
    <span
      {...restProps}
      role={isImage ? "img" : undefined}
      aria-label={isNamed ? label : undefined}
      css={[styles.root, sizeStyles[size], css]}
    >
      <span
        css={[corner.radius_round, styles.medallion, variantStyles[variant]]}
        aria-hidden
      >
        {monogram}
        {src === undefined ? null : (
          // Decorative: the root already carries the accessible name, so an
          // `alt` here would announce the person twice.
          <img src={src} alt="" css={styles.image} />
        )}
      </span>
      {hasBadge ? (
        <span
          css={[corner.radius_round, styles.badge, badgeSizeStyles[size]]}
          aria-hidden
        >
          {badge}
        </span>
      ) : null}
    </span>
  );
}

const styles = stylex.create({
  // Not clipped, so the badge can hang off the medallion's edge.
  root: {
    position: "relative",
    display: "inline-flex",
    flexShrink: 0,
    verticalAlign: "middle",
  },
  medallion: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    blockSize: "100%",
    overflow: "hidden",
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_0,
    userSelect: "none",
  },
  // No background, on purpose: a failed portrait paints nothing, so the
  // monogram underneath still shows through with no `onError` handler
  // needed. A background would repaint over the monogram whenever the image
  // fails or hasn't loaded yet.
  image: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: "100%",
    blockSize: "100%",
    objectFit: "cover",
  },
  badge: {
    position: "absolute",
    insetBlockEnd: 0,
    insetInlineEnd: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: "translate(25%, 25%)",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
    color: color.textMain,
    boxShadow: shadow._1,
  },
});

// rem-based, like Spinner's diameters, so sizing scales with the user's font
// size (WCAG 1.4.4) instead of a fixed pixel grid.
const sizeStyles = stylex.create({
  sm: {
    inlineSize: space._5,
    blockSize: space._5,
    fontSize: font.uiOverline,
  },
  md: {
    inlineSize: space._7,
    blockSize: space._7,
    fontSize: font.uiCaption,
  },
  lg: {
    inlineSize: space._8,
    blockSize: space._8,
    fontSize: font.uiBody,
  },
});

// The badge stays legible below a certain size, so `sm` and `md` share one
// diameter and only `lg` steps up.
const badgeSizeStyles = stylex.create({
  sm: {
    inlineSize: space._3,
    blockSize: space._3,
    fontSize: font.uiOverline,
  },
  md: {
    inlineSize: space._3,
    blockSize: space._3,
    fontSize: font.uiOverline,
  },
  lg: {
    inlineSize: space._4,
    blockSize: space._4,
    fontSize: font.uiCaption,
  },
});

const variantStyles = stylex.create({
  subtle: {
    backgroundColor: color.surfaceNeutralSubtle,
    color: color.textMuted,
    boxShadow: `inset 0 0 0 ${border.size_1} ${color.neutralBorder}`,
  },
  solid: {
    backgroundColor: color.bgInverse,
    color: color.textOnInverse,
  },
});
