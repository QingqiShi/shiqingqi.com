export const TMDB_BASE = "https://api.themoviedb.org";

export function toolExecutionOptions() {
  return {
    toolCallId: "test",
    messages: [],
    abortSignal: AbortSignal.timeout(10_000),
    context: {},
  };
}
