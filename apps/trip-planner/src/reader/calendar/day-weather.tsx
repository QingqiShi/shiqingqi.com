"use client";

import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import type { Day } from "#src/trips/types.ts";
import { weatherIcon } from "../day-facts.tsx";
import { TripText } from "../trip-text.tsx";
import { useWeatherCondition } from "../use-weather-condition.ts";
import type { LiveWeather } from "../weather/types.ts";
import { wmoGroup } from "../weather/wmo-group.ts";
import { Glyph } from "./glyph.tsx";

/** The day's weather as an icon and a temperature range. */
export function DayWeather({
  day,
  live,
  short = false,
}: {
  day: Day;
  live: LiveWeather | undefined;
  /** Leaves out the unit, where the room is small. */
  short?: boolean;
}) {
  const condition = useWeatherCondition();
  if (!live && !day.weather) return null;
  const group = live ? wmoGroup(live.code) : null;
  const temp = live ? live.temp : (day.weather?.temp ?? "");
  const shown = short ? temp.replace("°C", "°") : temp;
  return (
    <span css={[row.inline, styles.noWrap]}>
      <Glyph>{weatherIcon[group ?? "estimate"]}</Glyph>
      {group ? <span css={a11y.srOnly}>{condition(group)}</span> : null}
      <Text as="span" look="caption" numeric>
        {live ? shown : <TripText>{shown}</TripText>}
      </Text>
    </span>
  );
}

const styles = stylex.create({
  noWrap: { whiteSpace: "nowrap" },
});
