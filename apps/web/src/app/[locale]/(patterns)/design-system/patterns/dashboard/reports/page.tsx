import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DashboardScreen } from "#src/design-system/patterns/dashboard/dashboard-screen.tsx";
import { patternMetadata } from "#src/design-system/patterns/pattern-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    ...patternMetadata(
      validateLocale(locale),
      "/design-system/patterns/dashboard",
    ),
    robots: { index: false },
  };
}

export default function DashboardReportsPage() {
  return <DashboardScreen showsList />;
}
