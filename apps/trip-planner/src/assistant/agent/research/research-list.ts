import { z } from "zod";
import { clampText } from "../plain-line.ts";
import { RESEARCH_KINDS, type ResearchBrief } from "./research-brief.ts";

export const FIELD_CAPS = {
  name: 120,
  area: 160,
  quote: 300,
  url: 500,
} as const;

/** The most items in one list. */
export const MAX_ITEMS = 8;

/**
 * One place in a research list, as the server keeps it. Each field comes
 * from a web page, so it is data: capped, on one line, as `clampText` and
 * `cleanUrl` make it.
 */
export const researchItem = z.strictObject({
  /** The server's id of the item, which `show_cards` names. */
  id: z.string(),
  kind: z.enum(RESEARCH_KINDS),
  name: z.string(),
  area: z.string(),
  quote: z.string(),
  url: z.string(),
});
export type ResearchItem = z.output<typeof researchItem>;

/** The stored `card` of a research list: what the sub-agent found, and when. */
export const researchList = z.strictObject({
  type: z.literal("list"),
  brief: z.custom<ResearchBrief>(
    (value) => typeof value === "object" && value !== null,
  ),
  items: z.array(researchItem),
  readAt: z.iso.datetime(),
});
export type ResearchList = z.output<typeof researchList>;

/** One card that the person sees, made by the server from a stored item. */
export const researchCard = researchItem.extend({
  readAt: z.iso.datetime(),
  /** A search on Booking.com, for a place to stay. */
  bookingUrl: z.string().optional(),
  /** The day that the card fits, from the list's dates; the person picks. */
  dayId: z.string().optional(),
});
export type ResearchCard = z.output<typeof researchCard>;

/** The stored `card` of one `show_cards` call. */
export const shownCards = z.strictObject({
  type: z.literal("cards"),
  cards: z.array(researchCard),
});
export type ShownCards = z.output<typeof shownCards>;

const LOCAL_NAME = /(^|\.)(localhost|local|internal)$/;
const IPV4 = /^\d+\.\d+\.\d+\.\d+$/;
const NOT_IN_URL = /[<>"'`\s\p{Cc}\p{Cf}]/u;

/**
 * A public http or https page, normalized, or null: no user or password,
 * no `#part`, no IP address or local name for a host, and at most
 * `FIELD_CAPS.url` characters with nothing that could end a quote or a tag.
 */
export function cleanUrl(text: string): string | null {
  const raw = text.trim();
  if (raw.length > FIELD_CAPS.url * 4 || !URL.canParse(raw)) return null;
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username !== "" || url.password !== "") return null;
  url.hash = "";
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[") || IPV4.test(host) || LOCAL_NAME.test(host)) {
    return null;
  }
  const href = url.href;
  return href.length > FIELD_CAPS.url || NOT_IN_URL.test(href) ? null : href;
}

/** An item that the web gave, with each field made safe again, or null when its page address is not one to keep. */
export function cleanItem<T extends Omit<ResearchItem, "id">>(
  item: T,
): T | null {
  const url = cleanUrl(item.url);
  const name = clampText(item.name, FIELD_CAPS.name);
  if (url === null || name === "") return null;
  return {
    ...item,
    url,
    name,
    area: clampText(item.area, FIELD_CAPS.area),
    quote: clampText(item.quote, FIELD_CAPS.quote),
  };
}

/** The items of a stored list that are still safe to show, as `cleanItem` makes them. */
export function keptItems(list: ResearchList): ResearchItem[] {
  return list.items.flatMap((item) => cleanItem(item) ?? []);
}

/** Every web address in this conversation's research lists: only these may show as links. */
export function listedUrls(cards: readonly unknown[]): Set<string> {
  const urls = new Set<string>();
  for (const card of cards) {
    const list = researchList.safeParse(card);
    if (!list.success) continue;
    for (const item of keptItems(list.data)) urls.add(item.url);
  }
  return urls;
}
