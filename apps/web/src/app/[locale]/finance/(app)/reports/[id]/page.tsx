import type { Metadata } from "next";
import { ReportScreen } from "#src/finance/reports/report-screen.tsx";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";

interface ReportPageProps {
  params: Promise<{ locale: string; id: string }>;
}

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
