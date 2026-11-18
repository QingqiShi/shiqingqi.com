import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { notFound, permanentRedirect } from "next/navigation";
import { isTripId } from "#src/trips/is-trip-id.ts";

interface EditRouteProps {
  params: Promise<{ locale: string; trip: string }>;
}

// The edit screen is gone. An old link opens the reader, which checks access.
export default async function EditTripRoute({ params }: EditRouteProps) {
  const { locale, trip: id } = await params;
  if (!isTripId(id)) notFound();
  permanentRedirect(getLocalePath(`/${id}`, validateLocale(locale)));
}
