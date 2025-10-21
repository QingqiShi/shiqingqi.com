import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { BackgroundLines } from "@/components/home/background-lines";
import { Footer } from "@/components/home/footer";
import { FlowGradient } from "@/components/shared/flow-gradient/flow-gradient";
import { BASE_URL } from "@/constants";
import { i18nConfig } from "@/i18n-config";
import type { PageProps, SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { validateLocale } from "@/utils/validate-locale";
import translations from "./translations.json";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const validatedLocale = validateLocale(params.locale);
  const { t } = getTranslations(translations, validatedLocale);
  return {
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    applicationName: t("title"),
    manifest: "/manifest.json",
    alternates: {
      canonical: new URL("/", BASE_URL).toString(),
      languages: {
        en: new URL("/", BASE_URL).toString(),
        zh: new URL("/zh", BASE_URL).toString(),
      },
    },
  } satisfies Metadata;
}

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "zh" }];
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);

  if (!i18nConfig.locales.includes(validatedLocale)) {
    notFound();
  }

  return (
    <>
      <div
        className="absolute top-0 left-0 right-0 z-base h-[400px] sm:h-[500px] md:h-[600px] lg:h-[400px] xl:h-[max(400px,80dvh)]"
        role="presentation"
      >
        <Suspense fallback={null}>
          <ErrorBoundary fallback={null}>
            <FlowGradient />
          </ErrorBoundary>
        </Suspense>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 z-base overflow-hidden pointer-events-none h-[500px]"
        style={{
          backgroundImage: `radial-gradient(circle calc(500px*5) at center calc(500px*5), var(--color-control-active) calc(500px*4), transparent)`,
          opacity: "var(--color-opacity-active)",
        }}
        role="presentation"
      />
      <div className="max-w-[1080px] xl:max-w-[calc((1080/24)*1rem)] mx-auto py-0 px-3 ps-[calc(0.75rem+env(safe-area-inset-left))] pe-[calc(0.75rem+env(safe-area-inset-right))]">
        <div className="relative">
          <BackgroundLines />
          <main className="pt-11 sm:pt-12">{children}</main>
          <Footer locale={validatedLocale} />
        </div>
      </div>
    </>
  );
}
