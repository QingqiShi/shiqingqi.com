"use client";

import { BedIcon } from "@phosphor-icons/react/dist/ssr/Bed";
import { CarProfileIcon } from "@phosphor-icons/react/dist/ssr/CarProfile";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import type { ReactNode } from "react";
import type { Trip } from "#src/trips/types.ts";
import { TripText } from "../trip-text.tsx";
import type { LiveWeather } from "../weather/types.ts";
import { Agenda } from "./agenda.tsx";
import { Glyph } from "./glyph.tsx";
import { MonthGrid } from "./month-grid.tsx";
import type { TripStay } from "./trip-stays.ts";
import { tripStays } from "./trip-stays.ts";

export interface CalendarProps {
  trip: Trip;
  /** The bed of each night, by the date of the night. */
  stays: Map<string, TripStay>;
  /** The day that is today, or -1 outside the trip. */
  todayIndex: number;
  weatherByDay: Record<string, LiveWeather>;
  onOpenDay: (index: number) => void;
}

/** The trip in three figures: the beds, the hours at the wheel, the people. */
function Summary({ trip, stays }: Pick<CalendarProps, "trip" | "stays">) {
  const oneBed = t({ en: "1 place to sleep", zh: "1 处住宿" });
  const beds = t({ en: "{n} places to sleep", zh: "{n} 处住宿" });
  const driving = t({ en: "≈ {n}h at the wheel", zh: "驾车约 {n} 小时" });

  const bedCount = new Set(stays.values()).size;
  const drivingHours = Math.round(
    trip.days.reduce((sum, day) => sum + (day.drivingMinutes ?? 0), 0) / 60,
  );
  const facts: { key: string; icon: ReactNode; text: ReactNode }[] = [];
  if (bedCount > 0) {
    facts.push({
      key: "beds",
      icon: <BedIcon weight="bold" />,
      text: bedCount === 1 ? oneBed : beds.replace("{n}", String(bedCount)),
    });
  }
  if (drivingHours > 0) {
    facts.push({
      key: "driving",
      icon: <CarProfileIcon weight="bold" />,
      text: driving.replace("{n}", String(drivingHours)),
    });
  }
  if (trip.people.length > 0) {
    facts.push({
      key: "people",
      icon: <UsersThreeIcon weight="bold" />,
      text: (
        <TripText>
          {trip.people.map((person) => person.name).join(" · ")}
        </TripText>
      ),
    });
  }
  if (facts.length === 0) return null;

  return (
    <ul css={[stack.rows, cluster.item, styles.summary]}>
      {facts.map((fact) => (
        <li key={fact.key} css={row.inline}>
          <Glyph>{fact.icon}</Glyph>
          <Text as="span" look="bodySmall">
            {fact.text}
          </Text>
        </li>
      ))}
    </ul>
  );
}

/**
 * Every day of the trip at once: a month grid where the calendar is 54rem
 * wide or wider, and a list of the days where it is narrower. Each day is a way
 * into that day.
 */
export function TripCalendar(props: Omit<CalendarProps, "stays">) {
  const stays = tripStays(props.trip.days);
  return (
    <div css={[stack.item, styles.root]}>
      <Summary trip={props.trip} stays={stays} />
      <div css={styles.wide}>
        <MonthGrid {...props} stays={stays} />
      </div>
      <div css={styles.narrow}>
        <Agenda {...props} stays={stays} />
      </div>
    </div>
  );
}

// `show.wide` measures the split view, which is wider than the calendar by
// the sidebar, and seven days side by side need more than its 44rem. So the
// calendar measures itself.
const NARROW = "@container (width < 54rem)";

const styles = stylex.create({
  root: { containerType: "inline-size" },
  wide: { display: { default: null, [NARROW]: "none" } },
  narrow: { display: { default: "none", [NARROW]: "revert" } },
  summary: { color: color.mutedForeground },
});
