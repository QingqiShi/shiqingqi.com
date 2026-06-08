import {
  Car,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Route,
  Sun,
} from "lucide-react";
import { DayParty } from "./day-party";
import { Badge } from "@/components/ui/badge";
import type { Day } from "@/data/itinerary";
import { type LiveWeather, wmoGroup } from "@/lib/wmo";

/** Pick an icon that matches the day's actual condition. */
function WeatherIcon({ code }: { code: number }) {
  switch (wmoGroup(code)) {
    case "clear":
      return <Sun />;
    case "partly":
      return <CloudSun />;
    case "cloud":
      return <Cloud />;
    case "fog":
      return <CloudFog />;
    case "drizzle":
      return <CloudDrizzle />;
    case "rain":
    case "showers":
      return <CloudRain />;
    case "snow":
      return <CloudSnow />;
    case "thunder":
      return <CloudLightning />;
  }
}

export function DayHeader({
  day,
  isToday,
  liveWeather,
}: {
  day: Day;
  isToday: boolean;
  liveWeather?: LiveWeather;
}) {
  return (
    <header>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Day {day.n}</span>
            <span>·</span>
            <span>{day.dateLabel}</span>
            <span>{day.weekday}</span>
            {isToday ? <Badge className="ml-1">今天</Badge> : null}
          </div>

          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-balance">
            {day.title}
          </h2>

          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Route className="size-4 shrink-0" />
            {day.route}
          </p>
        </div>

        <DayParty dayN={day.n} className="shrink-0" />
      </div>

      {day.driving || day.weather ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {day.driving ? (
            <Badge variant="outline">
              <Car />
              {day.driving}
            </Badge>
          ) : null}
          {day.weather ? (
            <Badge variant="outline" className="whitespace-normal">
              {liveWeather ? (
                <WeatherIcon code={liveWeather.code} />
              ) : (
                <CloudSun />
              )}
              {liveWeather
                ? `${liveWeather.temp} · ${liveWeather.condition}${day.weather.note ? `，${day.weather.note}` : ""}`
                : `${day.weather.temp} · ${day.weather.summary}`}
              <span className="text-muted-foreground">
                {liveWeather ? `· ${liveWeather.updated}` : "· 预估"}
              </span>
            </Badge>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
