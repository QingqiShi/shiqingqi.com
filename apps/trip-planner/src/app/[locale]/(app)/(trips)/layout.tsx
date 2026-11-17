import { setLocale } from "@tuja/i18n/server-locale";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { tripSummary } from "#src/shell/trip-summary.ts";
import { TripsFrame } from "#src/shell/trips-frame.tsx";
import { getTrips, getViewerId } from "#src/trips/get-trips.ts";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = validateLocale((await params).locale);
  setLocale(locale);
  // A visitor who is not signed in gets the landing page, which has its own
  // frame. A trip page sends such a visitor to sign in.
  if ((await getViewerId()) === null) return children;
  // Which trip is on today depends on the wall clock.
  await connection();
  const now = new Date();
  const trips = await getTrips();
  return (
    <TripsFrame trips={trips.map(({ trip }) => tripSummary(trip, now, locale))}>
      {children}
    </TripsFrame>
  );
}
