/** `pathname` with the query of `params`, or `pathname` alone when `params` is empty. */
export function hrefWithParams(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
