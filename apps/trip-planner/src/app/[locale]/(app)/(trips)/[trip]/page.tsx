import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { dateRangeLabel } from "#src/reader/date-label.ts";
import { QuickEditProvider } from "#src/reader/quick-edit/quick-edit-provider.tsx";
import { TripDetailsButton } from "#src/reader/quick-edit/trip-details-button.tsx";
import { resolveDay } from "#src/reader/resolve-day.ts";
import { TripPage } from "#src/reader/trip-page.tsx";
import { getTripWeather } from "#src/reader/weather/get-trip-weather.ts";
import { getSharing } from "#src/share/get-sharing.ts";
import { ShareTrip } from "#src/share/share-trip.tsx";
import { canEditTrip } from "#src/trips/can-edit-trip.ts";
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
  const withSubtitle = t({
    en: "{dates}. {subtitle}: the plan for each day, with places, food and beds.",
    zh: "{dates}{subtitle}：每日安排、景点、餐厅与住宿。",
  });
  const withoutSubtitle = t({
    en: "{dates}: the plan for each day, with places, food and beds.",
    zh: "{dates}：每日安排、景点、餐厅与住宿。",
  });
  return {
    title: trip.title,
    description: (trip.subtitle ? withSubtitle : withoutSubtitle)
      .replace("{dates}", dateRangeLabel(trip.days, validateLocale(locale)))
      .replace("{subtitle}", trip.subtitle ?? ""),
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

  const canEdit = canEditTrip(viewed.role);
  const page = (
    <TripPage
      tripId={viewed.id}
      trip={trip}
      serverToday={serverToday}
      weatherByDay={weatherByDay}
      editHref={
        canEdit
          ? getLocalePath(`/${viewed.id}/edit`, validateLocale(locale))
          : undefined
      }
      actions={
        <>
          {sharing ? (
            <ShareTrip
              tripId={viewed.id}
              members={sharing.members}
              invites={sharing.invites.map((invite) => ({
                id: invite.id,
                expiresAt: invite.expiresAt.toISOString(),
              }))}
            />
          ) : null}
          <TripDetailsButton />
        </>
      }
    />
  );
  return canEdit ? (
    <QuickEditProvider
      key={viewed.id}
      tripId={viewed.id}
      trip={trip}
      isOwner={viewed.role === "owner"}
    >
      {page}
    </QuickEditProvider>
  ) : (
    page
  );
}
