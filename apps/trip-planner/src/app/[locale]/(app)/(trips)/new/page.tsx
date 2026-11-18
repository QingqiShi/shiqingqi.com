import { t } from "@tuja/i18n";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewTripConversation } from "#src/new-trip/new-trip-conversation.tsx";
import { getViewerId } from "#src/trips/get-trips.ts";

export function generateMetadata(): Metadata {
  return { title: t({ en: "New trip", zh: "新建行程" }) };
}

export default async function NewTripRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if ((await getViewerId()) === null) {
    redirect(signInPath(validateLocale(locale), "/new"));
  }
  return <NewTripConversation />;
}
