"use client";

import { BedIcon } from "@phosphor-icons/react/dist/ssr/Bed";
import { CarIcon } from "@phosphor-icons/react/dist/ssr/Car";
import { CloudIcon } from "@phosphor-icons/react/dist/ssr/Cloud";
import { CloudFogIcon } from "@phosphor-icons/react/dist/ssr/CloudFog";
import { CloudLightningIcon } from "@phosphor-icons/react/dist/ssr/CloudLightning";
import { CloudRainIcon } from "@phosphor-icons/react/dist/ssr/CloudRain";
import { CloudSnowIcon } from "@phosphor-icons/react/dist/ssr/CloudSnow";
import { CloudSunIcon } from "@phosphor-icons/react/dist/ssr/CloudSun";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { Stat } from "@tuja/ui/components/stat";
import { StatGroup } from "@tuja/ui/components/stat-group";
import type { ReactNode } from "react";
import type { Day } from "#src/trips/types.ts";
import { dateLabel } from "./date-label.ts";
import { splitNote } from "./split-note.ts";
import { TripText } from "./trip-text.tsx";
import { useWeatherCondition } from "./use-weather-condition.ts";
import type { LiveWeather } from "./weather/types.ts";
import type { WmoGroup } from "./weather/wmo-group.ts";
import { wmoGroup } from "./weather/wmo-group.ts";

function WeatherStat({
  weather,
  live,
}: {
  weather: NonNullable<Day["weather"]>;
  live: LiveWeather | undefined;
}) {
  const locale = useLocale();
  const condition = useWeatherCondition();
  const label = t({ en: "Weather", zh: "天气" });
  const updated = t({ en: "Updated {date}", zh: "{date}更新" });
  const estimate = t({ en: "Estimate", zh: "预估" });

  if (live) {
    const group = wmoGroup(live.code);
    return (
      <Stat
        label={label}
        value={live.temp}
        icon={weatherIcon[group]}
        detail={
          <MetaLine
            facts={[
              condition(group),
              weather.note ? (
                <TripText key="note">{weather.note}</TripText>
              ) : null,
              updated.replace("{date}", dateLabel(live.updated, locale)),
            ].filter(Boolean)}
          />
        }
      />
    );
  }
  return (
    <Stat
      label={label}
      value={<TripText>{weather.temp}</TripText>}
      icon={weatherIcon.estimate}
      detail={
        <MetaLine
          facts={[
            <TripText key="summary">{weather.summary}</TripText>,
            estimate,
          ]}
        />
      }
    />
  );
}

/**
 * A fact of the trip as the value of a `Stat`, with a note in brackets moved
 * to the line under it, such as "约 5 小时" over "（分段）".
 */
function TextStat({
  label,
  text,
  icon,
}: {
  label: string;
  text: string;
  icon: ReactNode;
}) {
  const { main, note } = splitNote(text);
  return (
    <Stat
      label={label}
      icon={icon}
      value={
        <span css={styles.value}>
          <TripText>{main}</TripText>
        </span>
      }
      detail={note ? <TripText>{note}</TripText> : undefined}
    />
  );
}

/** The day's weather, drive and bed, to take in at once. */
export function DayFacts({
  day,
  liveWeather,
}: {
  day: Day;
  liveWeather: LiveWeather | undefined;
}) {
  return (
    <StatGroup>
      {day.weather ? (
        <WeatherStat weather={day.weather} live={liveWeather} />
      ) : null}
      {day.driving ? (
        <TextStat
          label={t({ en: "Driving", zh: "驾车" })}
          text={day.driving}
          icon={<CarIcon weight="bold" />}
        />
      ) : null}
      <TextStat
        label={t({ en: "Tonight", zh: "今晚住" })}
        text={day.stay.summary}
        icon={<BedIcon weight="bold" />}
      />
    </StatGroup>
  );
}

const styles = stylex.create({
  // A `Stat` keeps a figure on one line. These values are names, which can
  // be longer than the card is wide.
  value: {
    textWrap: "balance",
  },
});

export const weatherIcon: Record<WmoGroup | "estimate", ReactNode> = {
  clear: <SunIcon weight="bold" />,
  partly: <CloudSunIcon weight="bold" />,
  cloud: <CloudIcon weight="bold" />,
  fog: <CloudFogIcon weight="bold" />,
  drizzle: <CloudRainIcon weight="bold" />,
  rain: <CloudRainIcon weight="bold" />,
  showers: <CloudRainIcon weight="bold" />,
  snow: <CloudSnowIcon weight="bold" />,
  thunder: <CloudLightningIcon weight="bold" />,
  estimate: <CloudSunIcon weight="bold" />,
};
