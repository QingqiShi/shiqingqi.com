import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "@/tokens.stylex";
import type { MediaListItem } from "@/utils/types";
import { Grid } from "./grid";
import { MediaCard } from "./media-card";

interface SearchResultsListProps {
  items: MediaListItem[];
  query: string;
  noResultsLabel: string;
}

export function SearchResultsList({
  items,
  query,
  noResultsLabel,
}: SearchResultsListProps) {
  if (items.length === 0) {
    return (
      <div css={styles.emptyState}>
        <SparkleIcon size={48} weight="fill" css={styles.emptyIcon} />
        <p css={styles.emptyText}>{noResultsLabel}</p>
        <p css={styles.emptyQuery}>"{query}"</p>
      </div>
    );
  }

  return (
    <Grid>
      {items.map((item, index) => (
        <MediaCard
          key={`${item.id}-${index}`}
          media={item}
          allowFollow={index < 20}
        />
      ))}
    </Grid>
  );
}

const styles = stylex.create({
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    textAlign: "center",
    padding: space._6,
  },

  emptyIcon: {
    color: color.textMuted,
    marginBottom: space._4,
  },

  emptyText: {
    fontSize: font.size_2,
    color: color.textMuted,
    margin: 0,
    marginBottom: space._2,
  },

  emptyQuery: {
    fontSize: font.size_1,
    color: color.controlActive,
    fontWeight: font.weight_6,
    margin: 0,
  },
});
