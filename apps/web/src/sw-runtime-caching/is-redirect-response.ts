/**
 * A locale redirect arrives in three shapes depending on the fetch's redirect
 * mode: a followed redirect (200, `redirected`), an opaqueredirect (status 0),
 * or the raw 3xx itself.
 */
export function isRedirectResponse(
  status: number,
  redirected: boolean,
): boolean {
  return redirected || status === 0 || (status >= 300 && status < 400);
}
