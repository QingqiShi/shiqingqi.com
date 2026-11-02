import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { permanentRedirect } from "next/navigation";

export default async function Page({
  params,
  searchParams,
}: PageProps & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const kept = new URLSearchParams();
  for (const name of ["connected", "error"]) {
    const value = query[name];
    if (typeof value === "string") kept.set(name, value);
  }
  const path = getLocalePath(
    "/settings/mailboxes",
    validateLocale((await params).locale),
  );
  permanentRedirect(kept.size > 0 ? `${path}?${kept.toString()}` : path);
}
