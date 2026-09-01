"use client";

import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { measure } from "../../measure.stylex.ts";

/** The Overview — TMDB's word for the plot synopsis, not a summary of the page. */
export function OverviewPanel({ overview }: { overview: string }) {
  return (
    <Text wrap="pretty" css={styles.prose}>
      {overview}
    </Text>
  );
}

const styles = stylex.create({
  prose: {
    maxInlineSize: measure.prose,
  },
});
