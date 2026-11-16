import { setLocale } from "@tuja/i18n/server-locale";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { tripSummary } from "#src/shell/trip-summary.ts";
import { TripsFrame } from "#src/shell/trips-frame.tsx";
import { trips } from "#src/trips/index.ts";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = validateLocale((await params).locale);
  setLocale(locale);
  // Which trip is on today depends on the wall clock.
  await connection();
  const now = new Date();
  return (
    <TripsFrame trips={trips.map((trip) => tripSummary(trip, now, locale))}>
      {children}
    </TripsFrame>
  );
}
