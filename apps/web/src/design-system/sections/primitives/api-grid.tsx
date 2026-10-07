import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { SpecCard } from "#src/design-system/spec-card.tsx";
import { t } from "#src/i18n.ts";

export interface ApiEntry {
  token: string;
  meta: string;
  description: string;
}

/** Renders a responsive grid of {@link SpecCard} rows for a primitive's members. */
export function ApiGrid({ entries }: { entries: ApiEntry[] }) {
  return (
    <div css={styles.apiGrid}>
      {entries.map((entry) => (
        <SpecCard key={entry.token} token={entry.token} meta={entry.meta}>
          <Text look="caption" tone="muted">
            {entry.description}
          </Text>
        </SpecCard>
      ))}
    </div>
  );
}

/** A row of genre chips, laid out by the primitive the specimen shows. */
export function GenreChips({ css }: { css: StyleProp }) {
  return (
    <div css={css}>
      <span css={[typeRole.caption, corner.radius_round, styles.chip]}>
        {t({ en: "Drama", zh: "剧情" })}
      </span>
      <span css={[typeRole.caption, corner.radius_round, styles.chip]}>
        {t({ en: "Sci-fi", zh: "科幻" })}
      </span>
      <span css={[typeRole.caption, corner.radius_round, styles.chip]}>
        {t({ en: "Thriller", zh: "惊悚" })}
      </span>
      <span css={[typeRole.caption, corner.radius_round, styles.chip]}>
        {t({ en: "Comedy", zh: "喜剧" })}
      </span>
    </div>
  );
}

const styles = stylex.create({
  apiGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(auto-fit, minmax(220px, 1fr))",
    },
    gap: rhythm.item,
  },
  chip: {
    paddingBlock: space._00,
    paddingInline: space._2,
    color: color.fgMuted,
    backgroundColor: color.bgControl,
    whiteSpace: "nowrap",
  },
});
