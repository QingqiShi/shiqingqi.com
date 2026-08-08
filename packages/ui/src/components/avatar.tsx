import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import { border, color, font, shadow, space } from "../tokens.stylex.ts";

type AvatarSize = "sm" | "md" | "lg";
type AvatarVariant = "subtle" | "solid";

interface AvatarBaseProps extends Omit<
  ComponentProps<"span">,
  "children" | "role" | "aria-label" | "className" | "style"
> {
  /**
   * Who the avatar stands for. Names the avatar and, without `src` or
   * `initials`, is the source of the derived monogram — so keep it to the
   * person. Anything the `badge` means belongs in `badgeLabel`.
   */
  name: string;
  /**
   * Portrait laid over the monogram. If it fails to load the monogram shows
   * through, so a URL that may 404 needs no handling at the callsite — the
   * trade for that is that the portrait should be opaque, since the monogram
   * would otherwise show through any transparent pixels.
   */
  src?: string;
  /**
   * Overrides the derived monogram. Use it when the derivation picks the wrong
   * characters, or to show a single character where two would crowd. An empty
   * string is treated as no override.
   */
  initials?: string;
  /** Diameter and type scale. Defaults to `"md"`. */
  size?: AvatarSize;
  /**
   * `"subtle"` (the default) is a quiet tinted medallion for someone simply
   * present. `"solid"` inverts it, so the people a view is actually about stand
   * out of a row of their peers.
   */
  variant?: AvatarVariant;
  /** StyleX overrides merged over the root — composed last so a caller wins. */
  css?: StyleProp;
}

/**
 * The badge is drawn, so it says nothing to a screen reader on its own.
 * `badgeLabel` is therefore required at the type level whenever `badge` is set
 * (and forbidden otherwise) — an avatar cannot ship a marker whose meaning only
 * exists visually.
 */
type AvatarBadgeProps =
  | {
      /**
       * Corner marker — a status dot, a small icon. Sits on its own surface so
       * it reads against the medallion and the page alike, and is drawn
       * `aria-hidden`; `badgeLabel` carries its meaning instead.
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

/**
 * Derive a monogram from a name: the first character of the first and last
 * words. A single-word name (including the unspaced CJK case) yields one
 * character rather than two unrelated ones. `Array.from` so an astral-plane
 * character is taken whole.
 */
function monogramFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = Array.from(words[0])[0] ?? "";
  if (words.length === 1) return first;
  const last = Array.from(words[words.length - 1])[0] ?? "";
  return first + last;
}

/**
 * A circular medallion standing for one person: their portrait when there is
 * one, a monogram derived from their name when there isn't, and an optional
 * badge in the corner.
 *
 * The whole thing is one `role="img"` named by `name` — plus `badgeLabel` when
 * there is a badge — so it announces as a single object rather than reading its
 * monogram out letter by letter. Renders a `<span>` and forwards native span
 * attributes (`id`, `data-*`, `ref`); `css` is composed last.
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
  // `||` rather than `??`: a record that carries `initials: ""` has no override
  // to honour, and falling through to the derived monogram beats a blank
  // medallion.
  const monogram = initials || monogramFrom(name);
  // One presence test drives both the badge element and the accessible name.
  // Truthiness, because `badge={person.isVerified && <CheckIcon />}` is the
  // idiomatic spelling and yields `false` — which `!= null` would have called
  // present, painting an empty circle and announcing a badge that isn't there.
  const hasBadge = Boolean(badge);
  // Space-separated rather than punctuated: the separator would have to be
  // localized, and screen readers already pause between the two runs.
  const label =
    hasBadge && badgeLabel !== undefined ? `${name} ${badgeLabel}` : name;
  const isNamed = label.trim() !== "";
  // `name` is required, so a blank one is a caller bug — but what to do about it
  // depends on whether anything is actually drawn. With no portrait and no
  // monogram there is nothing to announce, and `role="img"` would ship a graphic
  // with no accessible name (WCAG 1.1.1 — what axe reports as `role-img-alt`);
  // dropping the role leaves an empty span that assistive tech skips, which is
  // the honest description. With a portrait the picture is right there on
  // screen, so the role stays: an unnamed image is a defect an audit can see,
  // whereas silently removing it from the tree is one nothing can.
  const isDrawn = src !== undefined || monogram !== "";
  const isImage = isNamed || isDrawn;

  return (
    <span
      {...restProps}
      role={isImage ? "img" : undefined}
      aria-label={isNamed ? label : undefined}
      css={[styles.root, sizeStyles[size], css]}
    >
      <span css={[styles.medallion, variantStyles[variant]]} aria-hidden>
        {/* The monogram is always rendered and the portrait is layered over it,
            so a `src` that 404s falls back to the monogram with no client-side
            error handling: an `alt=""` image that fails to load paints nothing,
            leaving what is underneath visible. */}
        {monogram}
        {src === undefined ? null : (
          // Decorative: the root already carries the accessible name, so an
          // `alt` here would announce the person twice.
          <img src={src} alt="" css={styles.image} />
        )}
      </span>
      {hasBadge ? (
        <span css={[styles.badge, badgeSizeStyles[size]]} aria-hidden>
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
  // Positioned so the portrait can be laid over the monogram rather than
  // replacing it — see the fallback note at the render site.
  medallion: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    blockSize: "100%",
    overflow: "hidden",
    borderRadius: border.radius_round,
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_0,
    // A monogram is never selected on purpose; dragging across a row of them
    // just highlights letters.
    userSelect: "none",
  },
  // Deliberately paints no background of its own. That is the whole mechanism:
  // an `alt=""` image that fails to load draws nothing at all (no broken-image
  // placeholder), so the monogram underneath becomes the fallback for free, with
  // no `onError` and no client boundary on a component meant for lists of
  // people. Giving this a background would hide the monogram — verified in a
  // browser — because the failed image's box still paints its background, which
  // trades the 404 fallback away. The cost of leaving it transparent is that a
  // portrait with transparent pixels shows the monogram through them, and that
  // the monogram is visible for the moment before the portrait loads; both are
  // better than a blank circle whenever the URL is dead.
  image: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: "100%",
    blockSize: "100%",
    objectFit: "cover",
  },
  // Its own surface plus a hairline, so the badge reads on the medallion, the
  // page canvas, or a card alike — no matching the parent's background.
  badge: {
    position: "absolute",
    insetBlockEnd: 0,
    insetInlineEnd: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: "translate(25%, 25%)",
    borderRadius: border.radius_round,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
    color: color.textMain,
    boxShadow: shadow._1,
  },
});

// `rem`-based like Spinner's diameters, so the medallion scales with the user's
// font size (WCAG 1.4.4) rather than pinning to a pixel grid.
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

// The badge shrinks as a proportion of the medallion but never below a legible
// icon, so `sm` and `md` share a diameter and only `lg` steps up.
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
