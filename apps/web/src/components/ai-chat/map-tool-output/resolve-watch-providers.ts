import { presentWatchProvidersInputSchema } from "#src/ai-chat/tools/create-present-watch-providers-tool.ts";
import type { WatchProviderOutput } from "../tool-watch-providers";

export function resolveWatchProviders(
  input: unknown,
  watchProviders: ReadonlyMap<string, WatchProviderOutput>,
): WatchProviderOutput | null {
  const parsed = presentWatchProvidersInputSchema.safeParse(input);
  if (!parsed.success) return null;
  const key = `wp:region:${String(parsed.data.id)}:${parsed.data.media_type}:${parsed.data.region.toUpperCase()}`;
  return watchProviders.get(key) ?? null;
}
