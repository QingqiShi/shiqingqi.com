import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TripView } from "@/components/trip/trip-view";
import { tripBySlug } from "@/data/trips";
import { getTripWeather } from "@/lib/get-trip-weather";
import { resolveDay } from "@/lib/resolve-day";

// "Current day" depends on the wall clock, so render per-request.
export const dynamic = "force-dynamic";

interface TripPageProps {
  params: Promise<{ trip: string }>;
}

export async function generateMetadata({
  params,
}: TripPageProps): Promise<Metadata> {
  const { trip: slug } = await params;
  const trip = tripBySlug(slug);
  if (!trip) return {};
  return {
    title: `${trip.title} · 行程`,
    description: `${trip.dateRange}${trip.subtitle}：每日安排、景点、餐厅与住宿。`,
  };
}

export default async function TripPage({ params }: TripPageProps) {
  const { trip: slug } = await params;
  const trip = tripBySlug(slug);
  if (!trip) notFound();

  // eslint-disable-next-line @eslint-react/purity -- force-dynamic page: request time IS the content, and render is its only per-request phase
  const { index, phase, daysUntil } = resolveDay(new Date(), trip.days);
  // Live forecast for the days within Open-Meteo's horizon; cached server-side.
  const weatherByDay = await getTripWeather(trip.slug);

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
