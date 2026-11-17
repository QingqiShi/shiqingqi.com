import { t } from "@tuja/i18n";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { dateRangeLabel } from "#src/reader/date-label.ts";
import { resolveDay } from "#src/reader/resolve-day.ts";
import { TripPage } from "#src/reader/trip-page.tsx";
import { getTripWeather } from "#src/reader/weather/get-trip-weather.ts";
import { getSharing } from "#src/share/get-sharing.ts";
import { ShareTrip } from "#src/share/share-trip.tsx";
import { getTrip, getViewerId } from "#src/trips/get-trips.ts";
import { isTripId } from "#src/trips/is-trip-id.ts";

// "Current day" depends on the wall clock, so render per-request.
export const dynamic = "force-dynamic";

interface TripRouteProps {
  params: Promise<{ locale: string; trip: string }>;
}

export async function generateMetadata({
  params,
}: TripRouteProps): Promise<Metadata> {
  const { locale, trip: id } = await params;
  const trip = (await getTrip(id))?.trip;
  if (!trip) return {};
  const description = t({
    en: "{dates}. {subtitle}: the plan for each day, with places, food and beds.",
    zh: "{dates}{subtitle}：每日安排、景点、餐厅与住宿。",
  });
  return {
    title: trip.title,
    description: description
      .replace("{dates}", dateRangeLabel(trip.days, validateLocale(locale)))
      .replace("{subtitle}", trip.subtitle),
  };
}

export default async function TripRoute({ params }: TripRouteProps) {
  const { locale, trip: id } = await params;
  if (!isTripId(id)) notFound();
  const viewed = await getTrip(id);
  if (!viewed) {
    // The answer is the same for a trip that exists and one that does not,
    // so that it does not tell which trips there are.
    if ((await getViewerId()) === null) {
      redirect(signInPath(validateLocale(locale), `/${id}`));
    }
    notFound();
  }
  const { trip } = viewed;
  const viewerId = await getViewerId();
  const sharing =
    viewed.role === "owner" && viewerId !== null
      ? await getSharing(viewerId, viewed.id)
      : null;

  // force-dynamic page: request time IS the content, and render is its only per-request phase.
  const serverToday = resolveDay(new Date(), trip.days, trip.timeZone);
  // Live forecast for the days within Open-Meteo's horizon; cached server-side.
  const weatherByDay = await getTripWeather(trip);

  return (
    <TripPage
      tripId={viewed.id}
      trip={trip}
      serverToday={serverToday}
      weatherByDay={weatherByDay}
      actions={
        sharing ? (
          <ShareTrip
            tripId={viewed.id}
            members={sharing.members}
            invites={sharing.invites.map((invite) => ({
              id: invite.id,
              expiresAt: invite.expiresAt.toISOString(),
            }))}
          />
        ) : null
      }
    />
  );
}
