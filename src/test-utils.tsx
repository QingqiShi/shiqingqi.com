import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import React from "react";
import { render, userEvent } from "vitest-browser-react";

const createTestQueryClient = () =>
  new QueryClient({
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

function AllTheProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => createTestQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const customRender = async (
  ui: ReactElement,
  options?: { wrapper?: React.ComponentType<{ children: React.ReactNode }> },
) => render(ui, { wrapper: AllTheProviders, ...options });

export { customRender as render, userEvent };
export * from "vitest-browser-react";
