import { LockIcon } from "@phosphor-icons/react/dist/ssr/Lock";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { EmptyState } from "@tuja/ui/components/empty-state";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isTripUnlocked } from "#src/is-trip-unlocked.ts";
import { getTrip } from "#src/trips/get-trips.ts";
import { UnlockForm } from "./unlock-form.tsx";

// The unlock prompt depends on the per-request cookie, so render per-request.
export const dynamic = "force-dynamic";

interface UnlockPageProps {
  params: Promise<{ locale: string; trip: string }>;
}

export async function generateMetadata({
  params,
}: UnlockPageProps): Promise<Metadata> {
  validateLocale((await params).locale);
  return { title: t({ en: "Trip password", zh: "输入行程密码" }) };
}

export default async function UnlockPage({ params }: UnlockPageProps) {
  const { locale: localeParam, trip: slug } = await params;
  const locale = validateLocale(localeParam);
  const trip = await getTrip(slug);
  if (!trip) notFound();

  // Already unlocked (e.g. a bookmarked /unlock link) — skip straight to the
  // trip rather than asking for a password the visitor has already entered.
  if (await isTripUnlocked(slug)) {
    redirect(getLocalePath(`/${slug}`, locale));
  }

  return (
    <EmptyState
      level={2}
      icon={<LockIcon weight="bold" />}
      title={<span lang={trip.language}>{trip.title}</span>}
      description={t({
        en: "Each trip has its own password. Enter this one once, and the trip stays open on this device.",
        zh: "每个行程有各自的密码，输入一次后本机会记住。",
      })}
      action={<UnlockForm slug={trip.slug} />}
    />
  );
}
