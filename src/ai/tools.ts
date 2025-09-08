import "server-only";
import {
  searchMoviesByTitleTool,
  executeMovieSearchToolCall,
} from "./movie-search-tool";
import { movieDiscoveryTool, executeMovieToolCall } from "./movie-tool";
import {
  searchPersonByNameTool,
  executePersonSearchToolCall,
} from "./person-search-tool";
import {
  phaseCompletionTool,
  executePhaseCompletionToolCall,
} from "./phase-completion-tool";
import {
  searchTvShowsByTitleTool,
  executeTvSearchToolCall,
} from "./tv-search-tool";
import { tvDiscoveryTool, executeTvToolCall } from "./tv-tool";

// All available tools
export const availableTools = [
  movieDiscoveryTool,
  tvDiscoveryTool,
  searchMoviesByTitleTool,
  searchTvShowsByTitleTool,
  searchPersonByNameTool,
  phaseCompletionTool,
];

// Main tool execution function - routes to specific tool handlers
export async function executeToolCall(toolCall: {
  name: string;
  arguments: string;
  call_id: string;
}) {
  switch (toolCall.name) {
    case "discover_movies":
      return executeMovieToolCall(toolCall);

    case "discover_tv_shows":
      return executeTvToolCall(toolCall);

    case "search_movies_by_title":
      return executeMovieSearchToolCall(toolCall);

    case "search_tv_shows_by_title":
      return executeTvSearchToolCall(toolCall);

    case "search_person_by_name":
      return executePersonSearchToolCall(toolCall);

    case "complete_phase_1":
      return executePhaseCompletionToolCall(toolCall);

    default:
      throw new Error(`Unknown tool: ${toolCall.name}`);
  }
}
