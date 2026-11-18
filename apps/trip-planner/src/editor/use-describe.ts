import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { dateLabel } from "#src/reader/date-label.ts";
import { useTimeLabel } from "#src/reader/use-time-label.ts";
import { timeZoneLabel } from "#src/time-zones/time-zone-label.ts";
import { findMoment } from "#src/trips/ops/find-item.ts";
import type { Trip } from "#src/trips/types.ts";
import { itemName, locateItem } from "./build-outline.ts";
import { nightsAt } from "./stay-nights-ops.ts";
import { useDayLabels } from "./use-day-labels.ts";
import {
  useFieldLabels,
  useKindLabels,
  useOptionLabels,
} from "./use-field-labels.ts";

/**
 * The lines that say how a thing of the trip is, or null when the trip does
 * not have it. The first line names the thing: the name of a moment or an
 * item, else the day and the time.
 */
export function useDescribe() {
  const locale = useLocale();
  const dayLabels = useDayLabels();
  const kindLabels = useKindLabels();
  const lodgingLabels = useFieldLabels().lodging;
  const optionLabels = useOptionLabels();
  const timeLabel = useTimeLabel();
  const anyTime = t({ en: "No time", zh: "不定时" });
  const firstDay = t({ en: "First day: {date}", zh: "第一天：{date}" });
  const sameBed = t({ en: "Same bed as {day}", zh: "与{day}同住一处" });
  const oneNight = t({ en: "1 night", zh: "1 晚" });
  const manyNights = t({ en: "{count} nights", zh: "{count} 晚" });

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
      const bedIndex = trip.days.findIndex(
        (each) => each.id === day.stay.sameAs?.dayId,
      );
      return [
        dayLabels.dated(day, dayIndex),
        day.title,
        day.route,
        day.driving,
        day.stay.summary,
        day.stay.note,
        bedIndex >= 0
          ? sameBed.replace("{day}", dayLabels.number(bedIndex))
          : undefined,
      ].filter((line) => line !== undefined);
    }
    const moment = findMoment(trip, id);
    if (moment) {
      const { text, highlight, time, items } = moment.moment;
      const when = `${dayOf(moment.day.id)} · ${timeLabel(time)}`;
      const name = text ?? highlight?.label;
      return [
        name,
        when,
        highlight && highlight.label !== name ? highlight.label : undefined,
        // What the moment holds goes with it when the person takes it out.
        ...items.map(itemName),
      ].filter((line) => line !== undefined);
    }
    const found = locateItem(trip, id);
    if (!found) return null;
    const { item } = found;
    const kind = kindLabels[item.type];
    if (item.type === "lodging") {
      const nights = nightsAt(trip, found.dayId);
      return [
        item.name,
        `${kind} · ${dayOf(found.dayId)} · ${
          nights === 1
            ? oneNight
            : manyNights.replace("{count}", String(nights))
        }`,
        item.checkIn ? `${lodgingLabels.checkIn} ${item.checkIn}` : undefined,
        item.checkOut
          ? `${lodgingLabels.checkOut} ${item.checkOut}`
          : undefined,
        item.room ? `${lodgingLabels.room} ${item.room}` : undefined,
        item.status ? optionLabels[item.status] : undefined,
        item.address,
        item.note,
      ].filter((line) => line !== undefined);
    }
    return [
      itemName(item),
      `${kind} · ${dayOf(found.dayId)} · ${found.moment ? timeLabel(found.moment.time) : anyTime}`,
      "description" in item ? item.description : undefined,
      "note" in item ? item.note : undefined,
    ].filter((line) => line !== undefined);
  };
}
