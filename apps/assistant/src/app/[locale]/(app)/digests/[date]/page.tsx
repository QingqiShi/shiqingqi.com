import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { notFound, permanentRedirect } from "next/navigation";

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; date: string }>;
}) {
  const { locale, date } = await params;
  if (!LOCAL_DATE.test(date)) notFound();
  permanentRedirect(getLocalePath(`/reports/${date}`, validateLocale(locale)));
}
