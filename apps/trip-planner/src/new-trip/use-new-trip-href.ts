import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";

/** The segment of New trip under the trips. */
export const NEW_TRIP_SEGMENT = "new";

/** The path of New trip, in the person's language. */
export function useNewTripHref(): string {
  return getLocalePath(`/${NEW_TRIP_SEGMENT}`, useLocale());
}
