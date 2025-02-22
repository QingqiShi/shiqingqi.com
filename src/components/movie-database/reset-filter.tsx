"use client";

import { FunnelX } from "@phosphor-icons/react/dist/ssr/FunnelX";
import { useMovieFilters } from "@/hooks/use-movie-filters";
import { AnchorButton } from "../shared/anchor-button";

export function ResetFilter() {
  const { reset, resetUrl } = useMovieFilters();

  return (
    <AnchorButton
      href={resetUrl()}
      onClick={(e) => {
        e.preventDefault();
        reset();
      }}
      icon={<FunnelX />}
    />
  );
}
