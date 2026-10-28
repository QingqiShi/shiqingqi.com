import { redirect } from "next/navigation";
import { financeHref } from "#src/finance/navigation/finance-href.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";

/** An account opens on Net worth, in the column beside the list. */
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  redirect(
    financeHref({ screen: "netWorth", account: id }, validateLocale(locale)),
  );
}
