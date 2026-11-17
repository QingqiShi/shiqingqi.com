import { t } from "@tuja/i18n";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TripEditor } from "#src/editor/trip-editor.tsx";
import { canEditTrip } from "#src/trips/can-edit-trip.ts";
import { getTrip, getViewerId } from "#src/trips/get-trips.ts";
import { isTripId } from "#src/trips/is-trip-id.ts";

// The trip is as the database has it at each request.
export const dynamic = "force-dynamic";

interface EditRouteProps {
  params: Promise<{ locale: string; trip: string }>;
}

export async function generateMetadata({
  params,
}: EditRouteProps): Promise<Metadata> {
  const viewed = await getTrip((await params).trip);
  if (!viewed || !canEditTrip(viewed.role)) return {};
  return {
    title: t({ en: "Edit {title}", zh: "编辑 {title}" }).replace(
      "{title}",
      viewed.trip.title,
    ),
  };
}

export default async function EditTripRoute({ params }: EditRouteProps) {
  const { locale, trip: id } = await params;
  if (!isTripId(id)) notFound();
  const viewed = await getTrip(id);
  if (!viewed) {
    // The answer is the same for a trip that exists and one that does not,
    // so that it does not tell which trips there are.
    if ((await getViewerId()) === null) {
      redirect(signInPath(validateLocale(locale), `/${id}/edit`));
    }
    notFound();
  }
  // A member who cannot change the trip gets the answer of a trip that does
  // not exist too.
  if (!canEditTrip(viewed.role)) notFound();
  return (
    <TripEditor
      key={viewed.id}
      tripId={viewed.id}
      trip={viewed.trip}
      isOwner={viewed.role === "owner"}
    />
  );
}
