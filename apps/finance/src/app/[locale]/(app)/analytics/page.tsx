import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalyticsScreen } from "#src/finance/analytics/analytics-screen.tsx";

export const unstable_dynamicStaleTime = 300;

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Analytics", zh: "分析" }) };
}

export default function Page() {
  return (
    <Suspense>
      <AnalyticsScreen />
    </Suspense>
  );
}
