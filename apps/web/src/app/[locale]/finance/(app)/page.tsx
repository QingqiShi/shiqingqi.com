import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { NetWorthScreen } from "#src/finance/accounts/net-worth-screen.tsx";

export const unstable_dynamicStaleTime = 300;

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Net worth", zh: "净资产" }) };
}

export default function Page() {
  return <NetWorthScreen />;
}
