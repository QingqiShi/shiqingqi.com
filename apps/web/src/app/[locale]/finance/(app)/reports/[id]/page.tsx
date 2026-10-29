import { t } from "@tuja/i18n";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { ReportScreen } from "#src/finance/reports/report-screen.tsx";

interface ReportPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const unstable_dynamicStaleTime = 300;

export async function generateMetadata(
  props: ReportPageProps,
): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Weekly report", zh: "周报" }) };
}

export default async function Page({ params }: ReportPageProps) {
  const { id } = await params;
  return <ReportScreen id={id} headingLevel={1} />;
}
