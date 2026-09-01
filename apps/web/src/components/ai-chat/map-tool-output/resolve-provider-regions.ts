import { presentProviderRegionsInputSchema } from "#src/ai-chat/tools/create-present-provider-regions-tool.ts";
import type { WatchProviderOutput } from "../tool-watch-providers";

export function resolveProviderRegions(
  input: unknown,
  watchProviders: ReadonlyMap<string, WatchProviderOutput>,
): WatchProviderOutput | null {
  const parsed = presentProviderRegionsInputSchema.safeParse(input);
  if (!parsed.success) return null;
  const key = `wp:provider:${String(parsed.data.id)}:${parsed.data.media_type}:${parsed.data.provider_name.toLowerCase()}`;
  return watchProviders.get(key) ?? null;
}
