import { agent } from "#src/ai/agent.ts";
import cardTranslations from "#src/components/shared/card.translations.json";
import { TranslationProvider } from "#src/components/shared/translation-provider.tsx";
import type { SupportedLocale } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import translations from "../../app/[locale]/movie-database/translations.json";
import posterImageTranslations from "./poster-image.translations.json";
import { SearchResultsList } from "./search-results-list";

interface SearchContentProps {
  query: string;
  locale: SupportedLocale;
}

export async function SearchContent({ query, locale }: SearchContentProps) {
  const { t } = getTranslations(translations, locale);

  // Perform AI search
  const searchResult = await agent(query, locale);

  // Prepare translations for client components
  const clientTranslations = {
    card: cardTranslations,
    posterImage: posterImageTranslations,
  };

  return (
    <TranslationProvider locale={locale} translations={clientTranslations}>
      <SearchResultsList
        items={searchResult.items}
        query={query}
        noResultsLabel={t("noResults")}
      />
    </TranslationProvider>
  );
}
