import { z } from "zod";

export const RESEARCH_KINDS = ["eat", "stay", "sight", "other"] as const;
export type ResearchKind = (typeof RESEARCH_KINDS)[number];

/**
 * Text that names a web address in any form: a scheme, `www.`, a host with
 * a top-level domain, an IPv4 address, or an email address. The sub-agent
 * can fetch an address that is in its prompt, so such text could carry trip
 * data out.
 */
const ADDRESS_LIKE =
  /:\/\/|www\.|@|[a-z0-9-]\.[a-z]{2,}\b|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i;
/** The other ways to write the dot of a host: `。`, `[.]`, `(dot)` and the like. */
const DOT_SPELLING = /。|\s*[[(]\s*(?:\.|dot)\s*[\])]\s*/giu;

export function looksLikeAddress(text: string): boolean {
  return ADDRESS_LIKE.test(text.normalize("NFKC").replace(DOT_SPELLING, "."));
}

function briefText(max: number) {
  return z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((text) => !looksLikeAddress(text), {
      error:
        "Write no web address, domain or email address. The server gives the sub-agent the links from the person's own message.",
    })
    .refine((text) => !/[<>\r\n]/.test(text), {
      error: "Write one line, with no '<' or '>'.",
    });
}

/** What the main assistant may tell the research sub-agent: fixed fields, each with a cap, and no web address. */
export const researchBrief = z.strictObject({
  kind: z
    .enum(RESEARCH_KINDS)
    .describe(
      "eat: places to eat; stay: places to stay; sight: things to see; other.",
    ),
  find: briefText(100).describe(
    "What to find, in a short phrase, such as 'a simple lunch near the castle'.",
  ),
  area: briefText(100).describe("The city or area, such as 'Porto, Ribeira'."),
  dates: z
    .strictObject({ from: z.iso.date(), to: z.iso.date() })
    .optional()
    .describe(
      "The dates that it is for. For a place to stay: the night of arrival and the day of departure.",
    ),
  people: z.int().min(1).max(30).optional(),
  preferences: briefText(200)
    .optional()
    .describe("Wishes that the person said, such as 'vegetarian, quiet'."),
});
export type ResearchBrief = z.output<typeof researchBrief>;

const MAX_LINKS = 3;
const MAX_LINK_CHARS = 500;
const LINK = /https?:\/\/[^\s<>"'`]+/gi;
const TRAILING = /[.,;:!?)\]}'"。，；：！？）」』]+$/u;

/** The web addresses in the person's own message, at most 3, in order, once each. */
export function memberLinks(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(LINK)) {
    const link = match[0].replace(TRAILING, "");
    if (link.length > MAX_LINK_CHARS || !URL.canParse(link)) continue;
    found.add(link);
    if (found.size === MAX_LINKS) break;
  }
  return [...found];
}
