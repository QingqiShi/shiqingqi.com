# OpenAI API Integration Guide

## Overview

This document provides comprehensive guidance for integrating OpenAI's API into our Next.js application for AI-powered movie/TV search functionality. Based on OpenAI SDK v4+ patterns and Next.js 15+ best practices.

## Setup and Configuration

### Dependencies

```bash
pnpm add openai zod zod-to-json-schema
```

### Environment Variables

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o  # Optional, defaults to gpt-4o
OPENAI_MAX_TOKENS=4000  # Optional
```

### OpenAI Client Setup

```typescript
// src/utils/openai-client.ts
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o";
```

## Function/Tool Calling for TMDB Integration

### Tool Definitions with Type Safety

```typescript
// src/utils/openai-tools.ts
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// TMDB Genre mapping
export const MOVIE_GENRES = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  "science fiction": 878,
  "tv movie": 10770,
  thriller: 53,
  war: 10752,
  western: 37,
  superhero: 28, // Map to action, will be refined in post-processing
} as const;

export const TV_GENRES = {
  "action & adventure": 10759,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  kids: 10762,
  mystery: 9648,
  news: 10763,
  reality: 10764,
  "sci-fi & fantasy": 10765,
  soap: 10766,
  talk: 10767,
  "war & politics": 10768,
  western: 37,
} as const;

// Zod schemas for tool parameters
export const DiscoverMovieSchema = z.object({
  genres: z
    .array(z.string())
    .optional()
    .describe("Genre names like 'action', 'comedy', 'superhero'"),
  releaseYear: z.number().optional().describe("Specific release year"),
  releaseDateFrom: z
    .string()
    .optional()
    .describe("Release date from (YYYY-MM-DD)"),
  releaseDateTo: z.string().optional().describe("Release date to (YYYY-MM-DD)"),
  minRating: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .describe("Minimum average rating"),
  sortBy: z
    .enum([
      "popularity.desc",
      "popularity.asc",
      "vote_average.desc",
      "vote_average.asc",
      "release_date.desc",
      "release_date.asc",
    ])
    .optional(),
  keywords: z
    .array(z.string())
    .optional()
    .describe(
      "Specific keywords to look for (e.g., 'superhero', 'space', 'zombie')",
    ),
});

export const DiscoverTVSchema = z.object({
  genres: z.array(z.string()).optional(),
  firstAirDateFrom: z
    .string()
    .optional()
    .describe("First air date from (YYYY-MM-DD)"),
  firstAirDateTo: z
    .string()
    .optional()
    .describe("First air date to (YYYY-MM-DD)"),
  minRating: z.number().min(0).max(10).optional(),
  sortBy: z
    .enum([
      "popularity.desc",
      "popularity.asc",
      "vote_average.desc",
      "vote_average.asc",
      "first_air_date.desc",
      "first_air_date.asc",
    ])
    .optional(),
  keywords: z.array(z.string()).optional(),
});

export const FilterResultsSchema = z.object({
  query: z.string().describe("Original user query"),
  criteria: z
    .array(z.string())
    .describe(
      "Specific criteria to filter by (e.g., 'must contain superhero', 'exclude horror elements')",
    ),
  explanation: z.string().describe("Explanation of how results were filtered"),
});

// Tool functions
export const discoverMovies = async (
  params: z.infer<typeof DiscoverMovieSchema>,
) => {
  // Convert genre names to IDs
  const genreIds = params.genres
    ?.map(
      (genre) => MOVIE_GENRES[genre.toLowerCase() as keyof typeof MOVIE_GENRES],
    )
    .filter(Boolean);

  const tmdbParams = {
    with_genres: genreIds?.join(","),
    "primary_release_date.gte": params.releaseDateFrom,
    "primary_release_date.lte": params.releaseDateTo,
    year: params.releaseYear,
    "vote_average.gte": params.minRating,
    sort_by: params.sortBy || "popularity.desc",
  };

  return { type: "movie", tmdbParams, keywords: params.keywords };
};

export const discoverTVShows = async (
  params: z.infer<typeof DiscoverTVSchema>,
) => {
  const genreIds = params.genres
    ?.map((genre) => TV_GENRES[genre.toLowerCase() as keyof typeof TV_GENRES])
    .filter(Boolean);

  const tmdbParams = {
    with_genres: genreIds?.join(","),
    "first_air_date.gte": params.firstAirDateFrom,
    "first_air_date.lte": params.firstAirDateTo,
    "vote_average.gte": params.minRating,
    sort_by: params.sortBy || "popularity.desc",
  };

  return { type: "tv", tmdbParams, keywords: params.keywords };
};

// Tool definitions for OpenAI
export const TMDB_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "discover_movies",
      description:
        "Search for movies using TMDB discovery API with various filters",
      parameters: zodToJsonSchema(DiscoverMovieSchema),
      function: discoverMovies,
      parse: DiscoverMovieSchema.parse,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "discover_tv_shows",
      description:
        "Search for TV shows using TMDB discovery API with various filters",
      parameters: zodToJsonSchema(DiscoverTVSchema),
      function: discoverTVShows,
      parse: DiscoverTVSchema.parse,
    },
  },
];
```

### System Prompts

```typescript
// src/utils/openai-prompts.ts
export const SEARCH_INTERPRETER_PROMPT = `You are a movie and TV show search expert. Your job is to interpret natural language queries and convert them into structured TMDB API calls.

Guidelines:
1. Analyze the user's query for:
   - Content type preferences (movies, TV shows, or both)
   - Genre preferences (action, comedy, superhero, sci-fi, etc.)
   - Time constraints (recent, from specific years/decades, etc.)
   - Quality preferences (highly rated, popular, critically acclaimed)
   - Specific attributes (length, origin country, etc.)

2. Use the available tools to search for content:
   - discover_movies: For movie searches
   - discover_tv_shows: For TV show searches
   - Use both tools if the query could apply to either

3. For ambiguous queries, make reasonable assumptions:
   - "recent" = last 2-3 years
   - "highly rated" = rating >= 7.0
   - "popular" = sort by popularity
   - Map natural language genres to TMDB categories

4. Handle specific keywords that need post-processing:
   - "superhero" movies (not a TMDB genre, needs filtering)
   - "space" themes, "zombie" themes, etc.
   - Platform-specific content (Netflix, etc.)

5. Always provide clear explanations of your interpretation.

Current date: ${new Date().toISOString().split("T")[0]}`;

export const RESULT_FILTER_PROMPT = `You are a content filtering expert. Your job is to refine search results to better match the user's original intent.

Guidelines:
1. Analyze the original query and the TMDB results
2. Filter out results that don't truly match the user's intent
3. Look for specific keywords in titles, descriptions, and metadata
4. Consider context and common associations (e.g., superhero movies often include specific franchises)
5. Provide clear explanations for your filtering decisions
6. Maintain result quality while being inclusive of edge cases

Return the filtered results with explanations for why each item was included or excluded.`;
```

## API Route Implementation

### Search Interpretation Route

```typescript
// src/app/api/ai-search/interpret/route.ts
import { NextRequest, NextResponse } from "next/server";
import { openai, DEFAULT_MODEL } from "@/utils/openai-client";
import { TMDB_TOOLS, SEARCH_INTERPRETER_PROMPT } from "@/utils/openai-tools";

export async function POST(req: NextRequest) {
  try {
    const { query, locale = "en" } = await req.json();

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SEARCH_INTERPRETER_PROMPT },
        {
          role: "user",
          content: `User query: "${query}" (Language: ${locale})`,
        },
      ],
      tools: TMDB_TOOLS,
      tool_choice: "auto",
      temperature: 0.3,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("AI Search Interpretation Error:", error);
    return NextResponse.json(
      { error: "Failed to interpret search query" },
      { status: 500 },
    );
  }
}
```

### Streaming Search Route

```typescript
// src/app/api/ai-search/stream/route.ts
import { NextRequest } from "next/server";
import { openai, DEFAULT_MODEL } from "@/utils/openai-client";
import { TMDB_TOOLS, SEARCH_INTERPRETER_PROMPT } from "@/utils/openai-tools";

export async function POST(req: NextRequest) {
  const { query, locale = "en" } = await req.json();

  try {
    const stream = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SEARCH_INTERPRETER_PROMPT },
        {
          role: "user",
          content: `User query: "${query}" (Language: ${locale})`,
        },
      ],
      tools: TMDB_TOOLS,
      tool_choice: "auto",
      temperature: 0.3,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "content", content: delta.content })}\n\n`,
                ),
              );
            }

            if (delta?.tool_calls) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "tool_call", tool_calls: delta.tool_calls })}\n\n`,
                ),
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: "Stream failed" })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI Search Stream Error:", error);
    return new Response(JSON.stringify({ error: "Failed to process search" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

### Result Processing Route

```typescript
// src/app/api/ai-search/filter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { openai, DEFAULT_MODEL } from "@/utils/openai-client";
import { RESULT_FILTER_PROMPT } from "@/utils/openai-tools";

export async function POST(req: NextRequest) {
  try {
    const { query, results, keywords } = await req.json();

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: RESULT_FILTER_PROMPT },
        {
          role: "user",
          content: `Original query: "${query}"
Keywords to filter for: ${keywords?.join(", ") || "none"}
TMDB Results: ${JSON.stringify(results.slice(0, 20), null, 2)}

Please filter these results to better match the user's intent and provide explanations.`,
        },
      ],
      temperature: 0.2,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("AI Result Filtering Error:", error);
    return NextResponse.json(
      { error: "Failed to filter search results" },
      { status: 500 },
    );
  }
}
```

## Error Handling and Rate Limiting

### Comprehensive Error Handling

```typescript
// src/utils/openai-error-handler.ts
import { OpenAI } from "openai";

export class AISearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = "AISearchError";
  }
}

export async function handleOpenAIError(error: unknown): Promise<never> {
  if (error instanceof OpenAI.APIError) {
    switch (error.status) {
      case 429:
        throw new AISearchError(
          "Rate limit exceeded. Please try again in a moment.",
          "RATE_LIMIT",
          true,
        );
      case 401:
        throw new AISearchError(
          "Authentication failed. Please check API configuration.",
          "AUTH_ERROR",
          false,
        );
      case 503:
        throw new AISearchError(
          "OpenAI service temporarily unavailable.",
          "SERVICE_UNAVAILABLE",
          true,
        );
      default:
        throw new AISearchError(
          `OpenAI API error: ${error.message}`,
          "API_ERROR",
          false,
        );
    }
  }

  throw new AISearchError(
    "Unexpected error during AI processing",
    "UNKNOWN_ERROR",
    false,
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof AISearchError && !error.retryable) {
        throw error;
      }

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

## Client-Side Integration

### React Hook for AI Search

```typescript
// src/hooks/use-ai-search.ts
import { useState, useCallback } from "react";

interface AISearchState {
  isLoading: boolean;
  error: string | null;
  results: any[] | null;
  explanation: string | null;
}

export function useAISearch() {
  const [state, setState] = useState<AISearchState>({
    isLoading: false,
    error: null,
    results: null,
    explanation: null,
  });

  const search = useCallback(async (query: string, locale: string = "en") => {
    if (!query.trim()) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Stream the search process
      const response = await fetch("/api/ai-search/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, locale }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;

            try {
              const parsed = JSON.parse(data);
              // Handle streaming updates here
              console.log("Stream update:", parsed);
            } catch (e) {
              // Ignore malformed JSON
            }
          }
        }
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Search failed",
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      results: null,
      explanation: null,
    });
  }, []);

  return {
    ...state,
    search,
    reset,
  };
}
```

## Performance and Cost Optimization

### Caching Strategy

```typescript
// src/utils/ai-search-cache.ts
interface CacheItem {
  result: any;
  timestamp: number;
  expiresIn: number;
}

class AISearchCache {
  private cache = new Map<string, CacheItem>();
  private readonly DEFAULT_TTL = 1000 * 60 * 30; // 30 minutes

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.timestamp + item.expiresIn) {
      this.cache.delete(key);
      return null;
    }

    return item.result;
  }

  set(key: string, value: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      result: value,
      timestamp: Date.now(),
      expiresIn: ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Generate cache key from query and locale
  generateKey(query: string, locale: string): string {
    return `${locale}:${query.toLowerCase().trim()}`;
  }
}

export const aiSearchCache = new AISearchCache();
```

## Security Considerations

### Input Validation

```typescript
// src/utils/ai-search-validation.ts
import { z } from "zod";

export const SearchQuerySchema = z.object({
  query: z
    .string()
    .min(1, "Query cannot be empty")
    .max(500, "Query too long")
    .regex(/^[a-zA-Z0-9\s\-.,!?'"()]+$/, "Invalid characters in query"),
  locale: z.enum(["en", "zh"]).optional(),
});

export const validateSearchQuery = (input: unknown) => {
  return SearchQuerySchema.safeParse(input);
};
```

### Rate Limiting

```typescript
// src/utils/rate-limiter.ts
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();

  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60 * 1000, // 1 minute
  ) {}

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(clientId);

    if (!entry || now > entry.resetTime) {
      this.requests.set(clientId, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }
}

export const aiSearchRateLimit = new RateLimiter(20, 60 * 1000); // 20 requests per minute
```

## Testing Strategies

### Unit Test Example

```typescript
// src/utils/__tests__/openai-tools.test.ts
import { describe, it, expect } from "vitest";
import { discoverMovies, DiscoverMovieSchema } from "../openai-tools";

describe("OpenAI Tools", () => {
  it("should convert genre names to IDs correctly", async () => {
    const input = {
      genres: ["action", "comedy"],
      releaseYear: 2024,
      minRating: 7.0,
    };

    const result = await discoverMovies(input);

    expect(result).toEqual({
      type: "movie",
      tmdbParams: {
        with_genres: "28,35",
        year: 2024,
        "vote_average.gte": 7.0,
        sort_by: "popularity.desc",
      },
      keywords: undefined,
    });
  });

  it("should validate schema correctly", () => {
    const validInput = {
      genres: ["action"],
      releaseYear: 2024,
    };

    const result = DiscoverMovieSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
});
```

## Best Practices

### 1. Cost Management

- Cache common queries to reduce API calls
- Implement request deduplication
- Use appropriate model (gpt-4o vs gpt-4o-mini)
- Set reasonable token limits

### 2. Performance

- Stream responses for better perceived performance
- Implement proper error boundaries
- Use React.Suspense for loading states
- Optimize bundle size

### 3. User Experience

- Provide clear feedback during processing
- Handle edge cases gracefully
- Implement search history
- Allow query refinement

### 4. Reliability

- Implement comprehensive error handling
- Provide fallback to manual filters
- Use retry mechanisms with exponential backoff
- Monitor API usage and errors

## Monitoring and Analytics

### Key Metrics to Track

- Search success rate
- Average response time
- API cost per search
- Error rates by type
- User satisfaction metrics

### Implementation

```typescript
// src/utils/ai-search-analytics.ts
export const trackAISearchEvent = (
  event: string,
  properties: Record<string, any>,
) => {
  // Integrate with your analytics provider
  console.log("AI Search Event:", event, properties);
};

// Usage in components
trackAISearchEvent("search_initiated", { query: userQuery });
trackAISearchEvent("search_completed", {
  resultCount: results.length,
  duration: endTime - startTime,
});
```
