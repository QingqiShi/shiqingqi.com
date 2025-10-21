import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
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
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <SparkleIcon
          size={48}
          weight="fill"
          className="text-gray-11 dark:text-grayDark-11 mb-4"
        />
        <p className="text-lg text-gray-11 dark:text-grayDark-11 m-0 mb-2">
          {noResultsLabel}
        </p>
        <p className="text-base text-blue-11 dark:text-blueDark-11 font-semibold m-0">
          "{query}"
        </p>
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
