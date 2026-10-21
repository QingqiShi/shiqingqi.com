import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** The view transition type of a navigation that selects where nothing was selected. */
export const SELECTION_OPEN_TRANSITION = "url-selection-open";
/** The view transition type of a navigation that clears the selection. */
export const SELECTION_CLEAR_TRANSITION = "url-selection-clear";

const OPEN_TYPES = [SELECTION_OPEN_TRANSITION];
const CLEAR_TYPES = [SELECTION_CLEAR_TRANSITION];

/** A selection the URL carries, such as `?account=<id>`: a reload keeps it. */
export function useUrlSelection(param: string) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const value = searchParams.get(param);

  const hrefWith = (next: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (next === null) params.delete(param);
    else params.set(param, next);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return {
    value,
    /** The URL with the selection set, for a link. */
    hrefWith,
    /** The view transition types for a link from `hrefWith`. */
    linkTransitionTypes: value === null ? OPEN_TYPES : undefined,
    clear: () => {
      router.replace(hrefWith(null), {
        scroll: false,
        transitionTypes: CLEAR_TYPES,
      });
    },
  };
}
