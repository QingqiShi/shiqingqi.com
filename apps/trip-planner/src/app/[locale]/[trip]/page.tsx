import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isTripUnlocked } from "@/is-trip-unlocked";
import { dateRangeLabel } from "@/reader/date-label";
import { resolveDay } from "@/reader/resolve-day";
import { TripView } from "@/reader/trip-view";
import { getTripWeather } from "@/reader/weather/get-trip-weather";
import { tripBySlug } from "@/trips";

// "Current day" depends on the wall clock, so render per-request.
export const dynamic = "force-dynamic";

interface TripPageProps {
  params: Promise<{ locale: string; trip: string }>;
}

export async function generateMetadata({
  params,
}: TripPageProps): Promise<Metadata> {
  const { trip: slug } = await params;
  const trip = tripBySlug(slug);
  if (!trip) return {};
  return {
    title: `${trip.title} · 行程`,
    description: `${dateRangeLabel(trip.days, "zh")}${trip.subtitle}：每日安排、景点、餐厅与住宿。`,
  };
}

export default async function TripPage({ params }: TripPageProps) {
  const { locale, trip: slug } = await params;
  const trip = tripBySlug(slug);
  if (!trip) notFound();
  if (!(await isTripUnlocked(slug))) {
    redirect(getLocalePath(`/unlock/${slug}`, validateLocale(locale)));
  }

  // force-dynamic page: request time IS the content, and render is its only per-request phase.
  const { index, phase, daysUntil } = resolveDay(
    new Date(),
    trip.days,
    trip.timeZone,
  );
  // Live forecast for the days within Open-Meteo's horizon; cached server-side.
  const weatherByDay = await getTripWeather(trip);

  return (
    <TripView
      trip={trip}
      currentDayIndex={index}
      phase={phase}
      daysUntil={daysUntil}
      weatherByDay={weatherByDay}
    />
  );
}
