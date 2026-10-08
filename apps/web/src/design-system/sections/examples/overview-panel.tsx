"use client";

import { Text } from "@tuja/ui/components/text";

/** The Overview — TMDB's word for the plot synopsis, not a summary of the page. */
export function OverviewPanel({ overview }: { overview: string }) {
  return <Text>{overview}</Text>;
}
