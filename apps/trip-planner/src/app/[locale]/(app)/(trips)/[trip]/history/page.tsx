import { t } from "@tuja/i18n";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHistory } from "#src/history/get-history.ts";
import { requireEditableTrip } from "#src/history/require-editable-trip.ts";
import { VersionList } from "#src/history/version-list.tsx";
import { canEditTrip } from "#src/trips/can-edit-trip.ts";
import { getTrip } from "#src/trips/get-trips.ts";

// The versions are as the database has them at each request.
export const dynamic = "force-dynamic";

interface HistoryRouteProps {
  params: Promise<{ locale: string; trip: string }>;
  searchParams: Promise<{ changed?: string | string[] }>;
}

export async function generateMetadata({
  params,
}: HistoryRouteProps): Promise<Metadata> {
  const viewed = await getTrip((await params).trip);
  if (!viewed || !canEditTrip(viewed.role)) return {};
  return {
    title: t({ en: "History of {title}", zh: "{title} 的历史版本" }).replace(
      "{title}",
      viewed.trip.title,
    ),
  };
}

export default async function HistoryRoute({
  params,
  searchParams,
}: HistoryRouteProps) {
  const { locale, trip: id } = await params;
  const viewed = await requireEditableTrip(locale, id, `/${id}/history`);
  const versions = await getHistory.versions(viewed.id);
  if (!versions || versions.length === 0) notFound();
  return (
    <VersionList
      tripId={viewed.id}
      trip={viewed.trip}
      versions={versions}
      locale={validateLocale(locale)}
      // force-dynamic page: the time of the request is what "3 hours ago" counts from.
      now={new Date()}
      changed={(await searchParams).changed !== undefined}
    />
  );
}
