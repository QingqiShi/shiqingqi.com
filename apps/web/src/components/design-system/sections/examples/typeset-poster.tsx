import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import type { StyleProp } from "@tuja/ui/style-prop";
import { border, color, font, ratio, space } from "@tuja/ui/tokens.stylex";

interface TypesetPosterProps {
  /** The Movie's localized title, set as the poster's own artwork. */
  title: string;
  /**
   * The studio, set as the plate's eyebrow. Give it to the hero poster only —
   * at thumbnail size the line is unreadable.
   */
  studio?: string;
  /** Release year, set under the rule as the poster's footer line. */
  year?: string;
  /**
   * A credit for the poster's foot — the director. Give it to the hero poster
   * only; at thumbnail size the line is unreadable and just crowds the year.
   */
  credit?: string;
  /** `true` for the hero poster, `false` for the smaller Similar thumbnails. */
  lead?: boolean;
  /** StyleX overrides, composed last. */
  css?: StyleProp;
}

/**
 * A poster plate whose artwork is the title, typeset from the system's own type
 * scale onto a sunken surface at `ratio.poster`.
 *
 * The exemplar ships no image assets and makes no network request, so there is
 * no poster image to place — and a grey rectangle with a broken-image icon
 * would be the one element on the screen that isn't the design system doing
 * something. A typographic poster is an honest substitute: it occupies the exact
 * box a real poster would, in the exact aspect ratio (`ratio.poster`, TMDB's
 * 2:3), while every value in it — the surface, the hairline, the type step, the
 * tracking — is a token that the rest of the screen also uses.
 *
 * The plate is a printed one-sheet, so it is set in the three bands one has: the
 * studio along the top, the title holding the middle, and the billing block at
 * the foot. Three bands is what makes the space between them read as leading
 * rather than as a gap where the artwork failed to load — the earlier two-band
 * plate put the type in opposite corners and left the middle empty, which is the
 * shape of a broken image whatever is written in it.
 *
 * It takes its copy as props rather than calling `t()`, so the same component
 * serves the hero and the three Similar thumbnails without either of them
 * caring which locale is mounted.
 */
export function TypesetPoster({
  title,
  studio,
  year,
  credit,
  lead,
  css,
}: TypesetPosterProps) {
  const hasFooter = Boolean(credit ?? year);

  return (
    <div
      css={[
        corner.radius_2,
        styles.poster,
        lead ? styles.lead : styles.thumb,
        css,
      ]}
    >
      {studio ? (
        <Text as="span" variant="overline" tone="subtle" transform="uppercase">
          {studio}
        </Text>
      ) : null}
      {/* The title band. It takes the leftover height and centres in it, so the
          plate's negative space is split above and below the artwork instead of
          collecting in one hole under it. */}
      <span css={styles.titleBand}>
        <span css={[styles.title, lead ? styles.titleLead : styles.titleThumb]}>
          {title}
        </span>
      </span>
      {/* The billing block. Dropped whole when there is nothing to bill: a rule
          with no line under it is a dash floating in an empty plate. */}
      {hasFooter ? (
        <span css={styles.footer}>
          <span css={[corner.radius_round, styles.rule]} />
          {credit ? (
            <Text as="span" variant="caption" tone="muted" weight="medium">
              {credit}
            </Text>
          ) : null}
          {/* `overline` is doing the work here: its tracking and semibold default
              are the credit-block treatment, and its uppercase is a no-op on a
              year. Only `title` stays local, because `weight_8` is a step past
              what `Text` exposes. */}
          {year ? (
            <Text as="span" variant="overline" tone="subtle" numeric>
              {year}
            </Text>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  poster: {
    display: "flex",
    flexDirection: "column",
    aspectRatio: ratio.poster,
    inlineSize: "100%",
    overflow: "hidden",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurfaceSunken,
  },
  lead: {
    gap: space._2,
    // The padding steps with the plate. At the wide padding a 120px plate has
    // 88px of measure left inside it, which is narrower than the title set at
    // any step the plate is worth setting it at.
    padding: { default: space._2, [breakpoints.md]: space._4 },
  },
  // Tighter than the hero plate, and deliberately so: three thumbnails share
  // roughly 100px each at 390px, and at the hero's padding the measure left
  // inside the plate was narrower than the word "Harbour", so the guard on
  // `title` broke it mid-word.
  thumb: {
    gap: space._1,
    padding: space._2,
  },
  // Grows into whatever the eyebrow and the billing block leave, and centres the
  // title in it.
  titleBand: {
    display: "flex",
    flexGrow: 1,
    alignItems: "center",
    minBlockSize: 0,
  },
  title: {
    color: color.textMain,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_1,
    textWrap: "balance",
    // A guard, not a layout choice. The step and the plate are sized to fit the
    // exemplar's titles, but a localized title long enough to beat both should break
    // and stay readable rather than run under `overflow: hidden`.
    //
    // The floor is what makes the guard work: the title is a flex item, and at
    // `auto` it takes its longest word as a minimum and overflows the plate
    // instead of breaking inside it.
    minInlineSize: 0,
    overflowWrap: "break-word",
  },
  // A step up from the hero's own title, because on a 2:3 plate the title is the
  // artwork: at the heading step it read as a caption stranded at the top of an
  // empty box, and the negative space around it only becomes deliberate once the
  // type is big enough to be the subject.
  //
  // It steps down again below `lg`, where the plate is narrower: the sub-display
  // step needs about 176px of measure to set a word like "Northbound" on one
  // line, and `overflow: hidden` turns anything past that into a clipped title
  // rather than a wrapped one. The step and the plate width are set together in
  // `movie-detail-screen.tsx` — changing one without the other is what clips it.
  //
  // Container-relative, not viewport-relative: the plate is a fixed column from
  // `md` up, so a `vp` step would shrink the type exactly where the plate is
  // biggest.
  titleLead: {
    fontSize: {
      default: font.uiHeading3,
      [breakpoints.md]: font.uiHeading1,
      [breakpoints.lg]: font.uiSubDisplay,
    },
    lineHeight: font.lineHeight_00,
  },
  // Two steps up from `uiCaption`, which set the thumbnail title small enough
  // that the plate read as an empty box with a label on it rather than a poster.
  titleThumb: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_00,
  },
  footer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: space._0,
  },
  rule: {
    blockSize: border.size_2,
    inlineSize: space._5,
    backgroundColor: color.accentBorder,
    marginBlockEnd: space._00,
  },
});
