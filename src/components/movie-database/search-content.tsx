import { agent } from "#src/ai/agent.ts";
import { t } from "#src/i18n.ts";
import type { SupportedLocale } from "#src/types.ts";
import { SearchResultsList } from "./search-results-list";

interface SearchContentProps {
  query: string;
  locale: SupportedLocale;
}

export async function SearchContent({ query, locale }: SearchContentProps) {
  // Perform AI search
  const searchResult = await agent(query, locale);

  return (
    <SearchResultsList
      items={searchResult.items}
      query={query}
      noResultsLabel={t({
        en: "No results found for your search",
        zh: "没有找到匹配的结果",
      })}
    />
  );
}
