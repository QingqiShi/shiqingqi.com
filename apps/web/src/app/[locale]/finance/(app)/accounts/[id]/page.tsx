import { redirect } from "next/navigation";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";

/** An account opens on Net worth, in the column beside the list. */
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  redirect(
    getLocalePath(
      `/finance?account=${encodeURIComponent(id)}`,
      validateLocale(locale),
    ),
  );
}
