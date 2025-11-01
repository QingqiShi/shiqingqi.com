import "server-only";
import { z } from "zod";
import { agent } from "#src/ai/agent.ts";
import type { SupportedLocale } from "#src/types.ts";

// Request validation schema
const SearchParamsSchema = z.object({
  query: z
    .string()
    .min(1, "Query cannot be empty")
    .max(500, "Query too long")
    .transform((s) => s.trim()),
  locale: z.enum(["en", "zh"]).optional().default("en"),
});

export interface AISearchParams {
  query: string;
  locale?: string;
}

export interface AISearchResponse {
  success: boolean;
  query: string;
  locale: string;
  items: Array<{
    id: number;
    title?: string | null;
    posterPath?: string | null;
    rating?: number | null;
  }>;
  count: number;
}

export async function performAISearch(
  params: AISearchParams,
): Promise<AISearchResponse> {
  try {
    // Validate and sanitize input parameters
    const validatedData = SearchParamsSchema.parse(params);
    const { query, locale } = validatedData;

    // Execute AI agent
    const result = await agent(query, locale as SupportedLocale);

    return {
      success: true,
      query,
      locale,
      items: result.items,
      count: result.items.length,
    };
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid parameters: ${error.errors.map((e) => e.message).join(", ")}`,
      );
    }

    // Re-throw other errors to be handled by API route
    throw error;
  }
}
