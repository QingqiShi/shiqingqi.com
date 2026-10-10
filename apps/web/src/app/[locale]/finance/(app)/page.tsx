import type { Metadata } from "next";
import { NetWorthScreen } from "#src/finance/accounts/net-worth-screen.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Net worth", zh: "净资产" }) };
}

export default function Page() {
  return <NetWorthScreen />;
}
