import type { QueryFunction, QueryKey } from "@tanstack/react-query";
import { QueryClient, skipToken } from "@tanstack/react-query";

/**
 * Calls a `queryOptions()`-produced `queryFn` the way react-query would,
 * with a real (if otherwise unused) `QueryFunctionContext`. None of the
 * queryFns under test read their context, but the type still requires one.
 */
export async function callQueryFn<TData, TQueryKey extends QueryKey>(options: {
  queryKey: TQueryKey;
  queryFn?: QueryFunction<TData, TQueryKey> | typeof skipToken;
}): Promise<TData> {
  const { queryFn, queryKey } = options;
  if (!queryFn || queryFn === skipToken) {
    throw new Error("expected a queryFn");
  }
  return queryFn({
    client: new QueryClient(),
    queryKey,
    signal: new AbortController().signal,
    meta: undefined,
  });
}
