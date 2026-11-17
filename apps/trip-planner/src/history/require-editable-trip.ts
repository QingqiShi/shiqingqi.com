import { validateLocale } from "@tuja/i18n/validate-locale";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import { notFound, redirect } from "next/navigation";
import "server-only";
import { canEditTrip } from "#src/trips/can-edit-trip.ts";
import { getTrip, getViewerId } from "#src/trips/get-trips.ts";
import { isTripId } from "#src/trips/is-trip-id.ts";
import type { ViewedTrip } from "#src/trips/read-trips.ts";

/**
 * The trip at `/<id>` for a page that only a member who can change the trip
 * opens. Anyone else gets the answer of a trip that does not exist, so that
 * the page does not tell which trips there are; a visitor who is not signed
 * in goes to sign-in first.
 */
export async function requireEditableTrip(
  locale: string,
  id: string,
  path: string,
): Promise<ViewedTrip> {
  if (!isTripId(id)) notFound();
  const viewed = await getTrip(id);
  if (!viewed) {
    if ((await getViewerId()) === null) {
      redirect(signInPath(validateLocale(locale), path));
    }
    notFound();
  }
  if (!canEditTrip(viewed.role)) notFound();
  return viewed;
}
