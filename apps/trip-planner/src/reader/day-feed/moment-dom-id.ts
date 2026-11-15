/** A stable DOM id for a moment, shared by the feed (sets it) and the glance
 *  card / auto-scroll (target it). */
export function momentDomId(momentId: string): string {
  return `moment-${momentId}`;
}
