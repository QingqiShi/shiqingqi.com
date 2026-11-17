import { t } from "@tuja/i18n";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHistory } from "#src/history/get-history.ts";
import { requireEditableTrip } from "#src/history/require-editable-trip.ts";
import { VersionView } from "#src/history/version-view.tsx";
import { resolveDay } from "#src/reader/resolve-day.ts";
import { canEditTrip } from "#src/trips/can-edit-trip.ts";
import { getTrip } from "#src/trips/get-trips.ts";

// The version and the newest version are as the database has them at each request.
export const dynamic = "force-dynamic";

interface VersionRouteProps {
  params: Promise<{ locale: string; trip: string; revision: string }>;
}

function revisionOf(text: string) {
  return /^[1-9]\d{0,8}$/.test(text) ? Number(text) : null;
}

export async function generateMetadata({
  params,
}: VersionRouteProps): Promise<Metadata> {
  const viewed = await getTrip((await params).trip);
  if (!viewed || !canEditTrip(viewed.role)) return {};
  return {
    title: t({ en: "Old version of {title}", zh: "{title} 的旧版本" }).replace(
      "{title}",
      viewed.trip.title,
    ),
  };
}

export default async function VersionRoute({ params }: VersionRouteProps) {
  const { locale, trip: id, revision: path } = await params;
  const viewed = await requireEditableTrip(
    locale,
    id,
    `/${id}/history/${path}`,
  );
  const revision = revisionOf(path);
  const read =
    revision === null ? null : await getHistory.version(viewed.id, revision);
  const trip = read?.version.trip;
  if (!read || !trip) notFound();
  return (
    <VersionView
      tripId={viewed.id}
      timeZone={viewed.trip.timeZone}
      version={read.version}
      trip={trip}
      newest={read.newest}
      // force-dynamic page: the time of the request sets "today" on the trip.
      serverToday={resolveDay(new Date(), trip.days, trip.timeZone)}
      locale={validateLocale(locale)}
    />
  );
}
