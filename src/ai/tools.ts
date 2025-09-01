import "server-only";
import {
  searchMoviesByTitleTool,
  executeMovieSearchToolCall,
} from "./movie-search-tool";
import { movieDiscoveryTool, executeMovieToolCall } from "./movie-tool";
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

    default:
      throw new Error(`Unknown tool: ${toolCall.name}`);
  }
}
