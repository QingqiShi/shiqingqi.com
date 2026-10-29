/** The caption type role's size in pixels, which every axis label uses. */
const CAPTION_PX = 12;

const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u;

/**
 * About how wide an axis label draws, in pixels, without a layout pass: a
 * CJK or full-width character takes a full em, a space a quarter, anything
 * else a little over half.
 */
export function estimateLabelWidth(label: string): number {
  let ems = 0;
  for (const character of label) {
    if (WIDE.test(character)) ems += 1;
    else if (character === " ") ems += 0.25;
    else ems += 0.58;
  }
  return ems * CAPTION_PX;
}
