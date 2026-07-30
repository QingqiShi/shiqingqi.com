import { NotFoundScreen } from "#src/components/shared/not-found-screen.tsx";

/**
 * The 404 for a `notFound()` thrown while rendering a page under `[locale]` —
 * most often a Movie Database detail route for an id TMDB doesn't know. A
 * mistyped URL never reaches here: App Router rejects an unmatched path above
 * the `[locale]` segment, so those land on the root `not-found.tsx` instead.
 *
 * `not-found.tsx` takes no `params`, so `NotFoundScreen` reads the Locale from
 * the server locale store that `[locale]/layout.tsx` set from the route before
 * rendering its children. Next injects `noindex` on any `notFound()`, so this
 * boundary needs no metadata of its own to stay out of search results.
 */
export default function LocaleNotFound() {
  return <NotFoundScreen />;
}
