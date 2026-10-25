import { vi } from "vitest";

/**
 * Answers each media query with `matches(query)`. Call
 * `vi.restoreAllMocks()` after the test.
 *
 * @internal
 */
export function stubMediaQueries(matches: (query: string) => boolean) {
  const real = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) => {
    const list = real(query);
    Object.defineProperty(list, "matches", { value: matches(query) });
    return list;
  });
}
