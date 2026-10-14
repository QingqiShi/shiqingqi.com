"use client";

import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";

const HEADER_SLOTS = 2;

const ROWS = [
  { key: "stream", logoCount: 3 },
  { key: "rent", logoCount: 2 },
].map((row, index, rows) => ({
  ...row,
  firstSlot: rows
    .slice(0, index)
    .reduce((slot, previous) => slot + 1 + previous.logoCount, HEADER_SLOTS),
}));

const STAGGER_DELAY = 80;

export function ToolWatchProvidersSkeleton() {
  return (
    <div css={[corner.radius_2, styles.card]}>
      <div css={styles.headerRow}>
        <Skeleton width={100} height={14} delay={0} />
        <Skeleton width={24} height={18} delay={STAGGER_DELAY} />
      </div>
      <div css={stack.item}>
        {ROWS.map((row) => (
          <div key={row.key} css={stack.tight}>
            <Skeleton
              width={50}
              height={12}
              delay={row.firstSlot * STAGGER_DELAY}
            />
            <div css={styles.logoRow}>
              {Array.from({ length: row.logoCount }, (_, i) => (
                <Skeleton
                  key={`${row.key}-${String(i)}`}
                  width={36}
                  height={36}
                  delay={(row.firstSlot + 1 + i) * STAGGER_DELAY}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = stylex.create({
  card: {
    backgroundColor: color.bgSurfaceRaised,
    padding: space._3,
    marginTop: rhythm.item,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rhythm.tight,
  },
  logoRow: {
    display: "flex",
    gap: rhythm.tight,
  },
});
