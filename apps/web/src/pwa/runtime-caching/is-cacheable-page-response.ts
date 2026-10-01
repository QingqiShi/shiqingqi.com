/**
 * Whether a page response is safe to store: a plain 200 the browser reached
 * without following a redirect. Takes the two fields rather than a `Response`,
 * which cannot be constructed with `redirected` set.
 */
export function isCacheablePageResponse(
  status: number,
  redirected: boolean,
): boolean {
  return status === 200 && !redirected;
}
