"use client";

import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";

const styles = stylex.create({
  track: {
    position: "relative",
    blockSize: "0.5rem",
    backgroundColor: color.muted,
  },
  band: (start: string, size: string) => ({
    position: "absolute",
    insetBlock: 0,
    insetInlineStart: start,
    inlineSize: size,
    backgroundColor: color.primarySubtle,
    borderInlineWidth: "2px",
    borderInlineStyle: "solid",
    borderInlineColor: color.primary,
  }),
  marker: (at: string) => ({
    position: "absolute",
    insetBlockStart: "50%",
    insetInlineStart: at,
    inlineSize: "0.875rem",
    blockSize: "0.875rem",
    translate: "-50% -50%",
    borderRadius: "50%",
    backgroundColor: color.foreground,
    boxShadow: `0 0 0 2px ${color.card}`,
  }),
  markerOutside: {
    backgroundColor: color.warning,
  },
});

/**
 * Where a measured number sits against its target range: the range as a
 * band on a track and the number as a dot. A null bound is open, so the
 * band runs to that end of the track.
 */
export function RangeMeter({
  min,
  max,
  value,
  inside,
}: {
  min: number | null;
  max: number | null;
  value: number | null;
  inside: boolean | null;
}) {
  const points = [min, max, value].filter((point) => point !== null);
  if (points.length === 0) return null;
  const low = Math.min(...points);
  const high = Math.max(...points);
  const pad = (high - low) * 0.25 || Math.max(Math.abs(high) * 0.25, 1);
  const from = low - pad;
  const to = high + pad;
  const at = (point: number) =>
    `${String(((point - from) / (to - from)) * 100)}%`;
  const bandStart = min ?? from;
  const bandEnd = max ?? to;
  return (
    <div aria-hidden css={[corner.radius_1, styles.track]}>
      <div
        css={[
          corner.radius_1,
          styles.band(
            at(bandStart),
            `${String(((bandEnd - bandStart) / (to - from)) * 100)}%`,
          ),
        ]}
      />
      {value === null ? null : (
        <div
          css={[
            styles.marker(at(value)),
            inside === false && styles.markerOutside,
          ]}
        />
      )}
    </div>
  );
}
