import { momentMinutes } from "./moment-minutes.ts";
import type {
  Checklist,
  Day,
  Flight,
  MapPlace,
  Moment,
  MomentItem,
  MomentTime,
  NavLeg,
  Restaurant,
  SignSheet,
  Tip,
} from "@/trips/types";

type Item<T extends MomentItem["type"]> = Extract<MomentItem, { type: T }>;

/** One time slot of a day, with what happens around it, grouped by kind. */
export interface DayMoment {
  id: string;
  time: MomentTime;
  minutes: number;
  text?: string;
  flights: (Flight & { id: string })[];
  checklists: (Checklist & { id: string })[];
  signSheets: (SignSheet & { id: string })[];
  nav: (NavLeg & { id: string })[];
  dining: (Restaurant & { id: string })[];
  places: (MapPlace & { id: string })[];
  tips: (Tip & { id: string })[];
}

function ofType<T extends MomentItem["type"]>(moment: Moment, type: T) {
  return moment.items.filter((item): item is Item<T> => item.type === type);
}

/** The moments of a day in time order. A moment that only marks a highlight
 *  has nothing to show in the feed, so it is left out. */
export function buildDayFeed(day: Day): DayMoment[] {
  return day.moments
    .filter((moment) => moment.text !== undefined || moment.items.length > 0)
    .map((moment) => ({
      id: moment.id,
      time: moment.time,
      minutes: momentMinutes(moment.time),
      text: moment.text,
      flights: ofType(moment, "flight"),
      checklists: ofType(moment, "checklist"),
      signSheets: ofType(moment, "signSheet"),
      nav: ofType(moment, "nav"),
      dining: ofType(moment, "dining"),
      places: ofType(moment, "place"),
      tips: ofType(moment, "tip"),
    }))
    .sort((a, b) => a.minutes - b.minutes);
}

/** Every nav leg of the day, in time order. */
export function dayNavLegs(day: Day): NavLeg[] {
  return buildDayFeed(day).flatMap((moment) => moment.nav);
}

/** Every restaurant of the day: those with a meal slot, then the rest. */
export function dayRestaurants(day: Day): Restaurant[] {
  return [
    ...buildDayFeed(day).flatMap((moment) => moment.dining),
    ...day.dining,
  ];
}
