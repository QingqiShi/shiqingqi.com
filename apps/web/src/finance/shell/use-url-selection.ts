import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * A selection the URL carries, such as `?id=<transaction>`: a reload keeps
 * it, and the back button clears it when `select` pushed it.
 */
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
    select: (next: string) => {
      router.push(hrefWith(next), { scroll: false });
    },
    clear: () => {
      router.replace(hrefWith(null), { scroll: false });
    },
  };
}
