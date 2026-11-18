import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { dateLabel } from "#src/reader/date-label.ts";
import { useTimeLabel } from "#src/reader/use-time-label.ts";
import { timeZoneLabel } from "#src/time-zones/time-zone-label.ts";
import { findMoment } from "#src/trips/ops/find-item.ts";
import { itemName } from "#src/trips/ops/item-name.ts";
import type { Trip } from "#src/trips/types.ts";
import { locateItem } from "./build-outline.ts";
import { useDayLabels } from "./use-day-labels.ts";
import { useKindLabels } from "./use-field-labels.ts";

/** The lines that say how a thing of the trip is, or null when the trip does not have it. */
export function useDescribe() {
  const locale = useLocale();
  const dayLabels = useDayLabels();
  const kindLabels = useKindLabels();
  const timeLabel = useTimeLabel();
  const anyTime = t({ en: "No time", zh: "不定时" });
  const firstDay = t({ en: "First day: {date}", zh: "第一天：{date}" });

  return (trip: Trip, id: string): string[] | null => {
    const dayOf = (dayId: string) => {
      const index = trip.days.findIndex((day) => day.id === dayId);
      return dayLabels.dated(trip.days[index], index);
    };
    if (id === "trip") {
      return [
        trip.title,
        trip.subtitle,
        trip.party,
        firstDay.replace("{date}", dateLabel(trip.days[0].date, locale)),
        timeZoneLabel(trip.timeZone, locale),
      ].filter((line) => line !== undefined);
    }
    const dayIndex = trip.days.findIndex((day) => day.id === id);
    if (dayIndex >= 0) {
      const day = trip.days[dayIndex];
      return [
        dayLabels.dated(day, dayIndex),
        day.title,
        day.route,
        day.driving,
        day.stay.summary,
        day.stay.note,
      ].filter((line) => line !== undefined);
    }
    const moment = findMoment(trip, id);
    if (moment) {
      return [
        `${dayOf(moment.day.id)} · ${timeLabel(moment.moment.time)}`,
        moment.moment.text,
        // What the moment holds goes with it when the person takes it out.
        ...moment.moment.items.map(itemName),
      ].filter((line) => line !== undefined);
    }
    const found = locateItem(trip, id);
    if (!found) return null;
    const { item } = found;
    return [
      `${kindLabels[item.type]} · ${itemName(item)}`,
      `${dayOf(found.dayId)} · ${found.moment ? timeLabel(found.moment.time) : anyTime}`,
      "description" in item ? item.description : undefined,
      "note" in item ? item.note : undefined,
    ].filter((line) => line !== undefined);
  };
}
