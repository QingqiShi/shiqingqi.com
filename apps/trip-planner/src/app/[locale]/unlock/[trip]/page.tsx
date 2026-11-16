import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { UnlockForm } from "./unlock-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shadcn/card";
import { isTripUnlocked } from "@/trip-gate";
import { tripBySlug } from "@/trips";

// The unlock prompt depends on the per-request cookie, so render per-request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "输入行程密码",
};

interface UnlockPageProps {
  params: Promise<{ locale: string; trip: string }>;
}

export default async function UnlockPage({ params }: UnlockPageProps) {
  const { locale: localeParam, trip: slug } = await params;
  const locale = validateLocale(localeParam);
  const trip = tripBySlug(slug);
  if (!trip) notFound();

  // Already unlocked (e.g. a bookmarked /unlock link) — skip straight to the
  // trip rather than asking for a password the visitor has already entered.
  if (await isTripUnlocked(slug, await cookies())) {
    redirect(getLocalePath(`/${slug}`, locale));
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <div className="bg-muted text-muted-foreground mb-2 flex size-10 items-center justify-center rounded-full">
            <Lock className="size-5" />
          </div>
          <CardTitle className="text-xl tracking-tight">{trip.title}</CardTitle>
          <CardDescription>{trip.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <UnlockForm slug={trip.slug} locale={locale} />
          <p className="text-muted-foreground mt-4 text-center text-xs">
            每个行程有各自的密码
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
