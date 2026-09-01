import { getToolName, isToolUIPart, type UIMessage } from "ai";
import type { MediaListItem } from "#src/utils/media-list-item.ts";
import type { PersonListItem } from "#src/utils/person-list-item.ts";
import type { WatchProviderOutput } from "../tool-watch-providers";
import { buildPersonResultsMap } from "./build-person-results-map";
import { buildSearchResultsMap } from "./build-search-results-map";
import { buildWatchProvidersMap } from "./build-watch-providers-map";

export interface ToolOutputMaps {
  searchResultsMap: ReadonlyMap<string, MediaListItem>;
  personResultsMap: ReadonlyMap<number, PersonListItem>;
  watchProvidersMap: ReadonlyMap<string, WatchProviderOutput>;
}

export function accumulateToolOutputs(
  messages: ReadonlyArray<UIMessage>,
): ToolOutputMaps {
  const searchResultsMap = new Map<string, MediaListItem>();
  const personResultsMap = new Map<number, PersonListItem>();
  const watchProvidersMap = new Map<string, WatchProviderOutput>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (!isToolUIPart(part)) continue;
      if (part.state !== "output-available" || !("output" in part)) continue;

      const name = getToolName(part);

      for (const [k, v] of buildSearchResultsMap(name, part.output)) {
        searchResultsMap.set(k, v);
      }
      for (const [k, v] of buildPersonResultsMap(name, part.output)) {
        personResultsMap.set(k, v);
      }
      if (name === "watch_providers") {
        for (const [k, v] of buildWatchProvidersMap(part.output)) {
          watchProvidersMap.set(k, v);
        }
      }
    }
  }

  return { searchResultsMap, personResultsMap, watchProvidersMap };
}
