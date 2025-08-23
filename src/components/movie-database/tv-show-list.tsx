"use client";

import type { TvShowListItem } from "@/utils/tmdb-api";
import * as tmdbQueries from "@/utils/tmdb-queries";
import { MediaList } from "./media-list";
import { TvShowCard } from "./tv-show-card";

interface TvShowListProps {
  initialPage: number;
  notFoundLabel: string;
}

export function TvShowList({ initialPage, notFoundLabel }: TvShowListProps) {
  return (
    <MediaList<TvShowListItem>
      initialPage={initialPage}
      notFoundLabel={notFoundLabel}
      queryOptions={tmdbQueries.tvShowList}
      renderItem={(tvShow, allowFollow) => (
        <TvShowCard tvShow={tvShow} allowFollow={allowFollow} />
      )}
    />
  );
}
