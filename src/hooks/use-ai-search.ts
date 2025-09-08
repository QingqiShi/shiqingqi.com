"use client";

import { useMutation } from "@tanstack/react-query";
import type { SupportedLocale } from "@/types";
import type { MediaListItem } from "@/utils/types";

interface AISearchRequest {
  query: string;
  locale: SupportedLocale;
}

interface AISearchResponse {
  success: boolean;
  query: string;
  locale: string;
  items: MediaListItem[];
  count: number;
  error?: string;
}

async function searchWithAI({
  query,
  locale,
}: AISearchRequest): Promise<AISearchResponse> {
  const response = await fetch("/api/ai-search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, locale }),
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({ error: "Network error" }))) as { error: string };
    throw new Error(
      errorData.error || `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  return response.json() as Promise<AISearchResponse>;
}

export function useAISearch() {
  return useMutation({
    mutationFn: searchWithAI,
    onError: (error) => {
      console.error("AI search error:", error);
    },
  });
}
