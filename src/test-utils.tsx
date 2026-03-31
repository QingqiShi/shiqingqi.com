import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { RenderOptions } from "@testing-library/react";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import React, { Suspense } from "react";
import translations from "#src/_generated/i18n/translations.en.json";
import { I18nContext } from "#src/i18n/i18n-context.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";

const createTestQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  queryClient.setQueryData(tmdbQueries.configuration.queryKey, {
    images: {
      base_url: "http://image.tmdb.org/t/p/",
      secure_base_url: "https://image.tmdb.org/t/p/",
      poster_sizes: ["w92", "w154", "w185", "w342", "w500", "w780", "original"],
      logo_sizes: ["w45", "w92", "w154", "w185", "w300", "w500", "original"],
    },
  });

  return queryClient;
};

function AllTheProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => createTestQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <I18nContext value={{ translations }}>
        <Suspense>{children}</Suspense>
      </I18nContext>
    </QueryClientProvider>
  );
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
export { default as userEvent } from "@testing-library/user-event";
