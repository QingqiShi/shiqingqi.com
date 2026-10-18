/**
 * Auto-detect path parameters from URL pattern
 * @param {string} pathPattern - URL pattern like "/3/movie/{movie_id}"
 * @returns {string[]} Array of parameter names
 */
export function extractPathParams(pathPattern) {
  const matches = pathPattern.match(/{([^}]+)}/g);
  if (!matches) return [];
  return matches.map((match) => match.slice(1, -1)); // Remove { and }
}
