"use client";

import { CarProfileIcon } from "@phosphor-icons/react/dist/ssr/CarProfile";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { border, space } from "@tuja/ui/tokens.stylex";
import { Glyph } from "./glyph.tsx";

/** A day of driving that fills the meter. */
const FULL_DRIVE_MINUTES = 7 * 60;

/** The time at the wheel, as a bar against a long day of driving. */
export function DriveMeter({ minutes }: { minutes: number | undefined }) {
  const none = t({ en: "No driving", zh: "不开车" });
  const label = t({ en: "Driving", zh: "驾车" });
  const hoursOnly = t({ en: "{h}h", zh: "{h}小时" });
  const hoursAndMinutes = t({ en: "{h}h{mm}", zh: "{h}小时{m}分" });
  const minutesOnly = t({ en: "0h{mm}", zh: "{m}分钟" });
  if (minutes === undefined) return null;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const driveTime = (
    rest === 0 ? hoursOnly : hours === 0 ? minutesOnly : hoursAndMinutes
  )
    .replace("{h}", String(hours))
    .replace("{mm}", String(rest).padStart(2, "0"))
    .replace("{m}", String(rest));

  return (
    <span css={[row.inline, styles.drive]}>
      <Glyph css={styles.glyph}>
        <CarProfileIcon weight="bold" />
      </Glyph>
      <span css={a11y.srOnly}>{label}</span>
      <span css={styles.meterTrack} aria-hidden>
        <span
          css={[
            styles.meterFill,
            styles.meterWidth(Math.min(minutes / FULL_DRIVE_MINUTES, 1)),
          ]}
        />
      </span>
      <Text as="span" look="caption" tone="muted" numeric css={styles.noWrap}>
        {minutes === 0 ? none : driveTime}
      </Text>
    </span>
  );
}

const styles = stylex.create({
  noWrap: { whiteSpace: "nowrap" },
  glyph: { color: color.mutedForeground },
  drive: { minWidth: 0 },
  meterTrack: {
    flexGrow: 1,
    flexShrink: 1,
    width: space._7,
    minWidth: 0,
    height: space._0,
    borderRadius: border.radius_round,
    cornerShape: "round",
    // The border colour shows on a card and on the fill of a row under the
    // pointer, which is `color.muted` itself.
    backgroundColor: color.border,
    overflow: "hidden",
  },
  meterFill: {
    display: "block",
    height: "100%",
    borderRadius: border.radius_round,
    cornerShape: "round",
    backgroundColor: color.foreground,
  },
  meterWidth: (fraction: number) => ({ width: `${String(fraction * 100)}%` }),
});
