/** The sections of a digest that list mail one sentence at a time, in the order the page shows them. */
export const DIGEST_SECTIONS = ["act", "unsure", "fyi"] as const;
export type DigestSection = (typeof DIGEST_SECTIONS)[number];

/** A value for each section. */
export function perSection<T>(
  make: (section: DigestSection) => T,
): Record<DigestSection, T> {
  return { act: make("act"), unsure: make("unsure"), fyi: make("fyi") };
}
