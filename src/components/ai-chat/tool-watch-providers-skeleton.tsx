"use client";

import * as stylex from "@stylexjs/stylex";
import { border, color, space } from "#src/tokens.stylex.ts";
import { Skeleton } from "../shared/skeleton";

const ROWS = [
  { key: "stream", logoCount: 3 },
  { key: "rent", logoCount: 2 },
];

const STAGGER_DELAY = 80;

export function ToolWatchProvidersSkeleton() {
  let delayIndex = 0;
  return (
    <div css={styles.card}>
      <div css={styles.headerRow}>
        <Skeleton
          width={100}
          height={14}
          delay={delayIndex++ * STAGGER_DELAY}
        />
        <Skeleton width={24} height={18} delay={delayIndex++ * STAGGER_DELAY} />
      </div>
      {ROWS.map((row) => (
        <div key={row.key} css={styles.section}>
          <Skeleton
            width={50}
            height={12}
            delay={delayIndex++ * STAGGER_DELAY}
          />
          <div css={styles.logoRow}>
            {Array.from({ length: row.logoCount }, (_, i) => (
              <Skeleton
                key={`${row.key}-${String(i)}`}
                width={36}
                height={36}
                delay={delayIndex++ * STAGGER_DELAY}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = stylex.create({
  card: {
    backgroundColor: color.backgroundHover,
    borderRadius: border.radius_2,
    padding: space._3,
    marginTop: space._2,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: space._2,
  },
  section: {
    marginBottom: space._2,
  },
  logoRow: {
    display: "flex",
    gap: space._1,
    marginTop: space._1,
  },
});
