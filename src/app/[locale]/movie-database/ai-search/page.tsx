"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConversationalSearch } from "@/components/ai-search/conversational-search";
import { TranslationContextProvider } from "@/components/shared/translation-context-provider";
import type { PageProps } from "@/types";
import translations from "../translations.json";
import posterImageTranslations from "@/components/movie-database/poster-image.translations.json";
import cardTranslations from "@/components/shared/card.translations.json";

export default function AISearchPage(props: PageProps) {
  const params = props.params;
  const searchParams = useSearchParams();
  const router = useRouter();

  // Extract initial query from URL (computed, not state)
  const initialQuery = useMemo(
    () => searchParams.get("initial") ?? undefined,
    [searchParams],
  );

  const [locale, setLocale] = useState<"en" | "zh">("en");

  useEffect(() => {
    void (async () => {
      const resolvedParams = await params;
      setLocale(resolvedParams.locale);
    })();
  }, [params]);

  const handleInitialQuerySent = () => {
    // Clear the initial query param from URL after sending
    router.replace(`/${locale}/movie-database/ai-search`);
  };

  // Transform translations for provider
  const transformedTranslations: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(translations)) {
    if (typeof value === "object" && value !== null && locale in value) {
      transformedTranslations[key] = value[locale];
    }
  }

  // Transform poster image translations
  const transformedPosterImageTranslations: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(posterImageTranslations)) {
    if (typeof value === "object" && value !== null && locale in value) {
      transformedPosterImageTranslations[key] = value[locale];
    }
  }

  // Transform card translations
  const transformedCardTranslations: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(cardTranslations)) {
    if (typeof value === "object" && value !== null && locale in value) {
      transformedCardTranslations[key] = value[locale];
    }
  }

  return (
    <TranslationContextProvider
      translations={{
        "movie-database": transformedTranslations,
        posterImage: transformedPosterImageTranslations,
        card: transformedCardTranslations,
      }}
      locale={locale}
    >
      <ConversationalSearch
        locale={locale}
        initialQuery={initialQuery}
        onInitialQuerySent={handleInitialQuerySent}
      />
    </TranslationContextProvider>
  );
}
