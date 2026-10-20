import type { Metadata } from "next";
import { ReportsIndex } from "#src/finance/reports/reports-index.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";

export const unstable_dynamicStaleTime = 300;

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Reports", zh: "周报" }) };
}

export default function Page() {
  return <ReportsIndex />;
}
