import { newId } from "#src/trips/ops/new-id.ts";
import type { DraftOp } from "#src/trips/ops/op-schema.ts";
import type { Trip } from "#src/trips/types.ts";
import { labelledEvent } from "../plain-line.ts";
import type { ResearchBrief } from "./research-brief.ts";
import type { ResearchCard, ResearchItem } from "./research-list.ts";

export const CARD_ACTIONS = ["add", "backup"] as const;
export type CardAction = (typeof CARD_ACTIONS)[number];

function addDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

/**
 * A search on Booking.com for places to stay in the list's area, with the
 * dates of the list kept inside the trip and the trip's travellers. The
 * server makes it: the model never writes a link.
 *
 * It searches the area, not the place: Booking.com drops the dates and the
 * travellers too when it does not know the name that it gets.
 */
function bookingSearchUrl(
  brief: Pick<ResearchBrief, "area" | "dates" | "people">,
  trip: Pick<Trip, "days" | "people">,
): string {
  const url = new URL("https://www.booking.com/searchresults.html");
  url.searchParams.set("ss", brief.area);
  const first = trip.days[0].date;
  const last = trip.days[trip.days.length - 1].date;
  if (brief.dates) {
    const from = [brief.dates.from, first].sort()[1];
    const checkin = [from, last].sort()[0];
    const checkout = [
      [brief.dates.to, addDays(checkin, 1)].sort()[1],
      addDays(last, 1),
    ].sort()[0];
    url.searchParams.set("checkin", checkin);
    url.searchParams.set("checkout", checkout);
  }
  const adults = trip.people.length > 0 ? trip.people.length : brief.people;
  if (adults) url.searchParams.set("group_adults", String(adults));
  url.searchParams.set("no_rooms", "1");
  return url.toString();
}

/** The card of a stored item, with what the server adds to it. */
function cardOf(
  item: ResearchItem,
  brief: ResearchBrief,
  readAt: string,
  trip: Trip,
): ResearchCard {
  const day = brief.dates
    ? trip.days.find((each) => each.date === brief.dates?.from)
    : undefined;
  return {
    ...item,
    readAt,
    ...(item.kind === "stay" && {
      bookingUrl: bookingSearchUrl(brief, trip),
    }),
    ...(day && { dayId: day.id }),
  };
}

/**
 * The ops of a button on a card: the place goes in the day's list of its
 * kind. "add" makes it a first choice, or a stay to confirm; "backup" makes
 * it an option.
 */
function cardOps(
  card: ResearchCard,
  action: CardAction,
  dayId: string,
): DraftOp[] {
  const id = newId();
  const area = card.area === "" ? undefined : card.area;
  const query = area ? `${card.name}, ${area}` : card.name;
  switch (card.kind) {
    case "eat":
      return [
        {
          op: "addItem",
          to: { dayId, list: "dining" },
          item: {
            id,
            type: "dining",
            name: card.name,
            query,
            ...(area && { area }),
            description: card.quote,
            website: card.url,
            ...(action === "add" && { status: "pick" as const }),
          },
        },
      ];
    case "stay":
      return [
        {
          op: "addItem",
          to: { dayId, list: "lodging" },
          item: {
            id,
            type: "lodging",
            name: card.name,
            query,
            ...(area && { address: area }),
            note: `${card.quote} ${card.url}`,
            status: action === "add" ? "pending" : "option",
          },
        },
      ];
    case "sight":
    case "other":
      return [
        {
          op: "addItem",
          to: { dayId, list: "places" },
          item: {
            id,
            type: "place",
            name: card.name,
            query,
            note: `${card.quote} ${card.url}`,
            tier: action === "add" ? "primary" : "backup",
          },
        },
      ];
  }
}

/** What the model reads after a tap on a card: the server's facts, then the card's name from the web as a label. */
function eventText(
  card: Pick<ResearchCard, "id" | "name">,
  action: CardAction,
  day: string,
  version: string,
): string {
  const saved = action === "add" ? "added it to" : "saved it as a backup on";
  return labelledEvent(
    `The person tapped a button on research card ${card.id}, which ${saved} day ${day}. The trip is now version ${version}.`,
    card.name,
  );
}

export const researchCards = { bookingSearchUrl, cardOf, cardOps, eventText };
