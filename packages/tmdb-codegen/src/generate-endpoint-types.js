import fs from "fs";
import path from "path";
import { endpoints } from "./endpoints.js";

/**
 * Write the endpoint path union and list into `_generated`.
 * @param {string} projectRoot - Root of the app the output belongs to
 */
export function generateEndpointTypes(projectRoot) {
  // Generate a helper file for endpoint paths
  const endpointPaths = endpoints.map((e) => e.path).sort();
  const typeContent = `/**
 * TMDB endpoint paths - auto-generated
 * Do not edit manually - changes will be overwritten.
 */

export type TMDBEndpointPaths = ${endpointPaths.map((p) => `"${p}"`).join(" | ")};

export const TMDB_ENDPOINTS = [
${endpointPaths.map((p) => `  "${p}"`).join(",\n")}
] as const;
`;

  const typesPath = path.join(
    projectRoot,
    "src",
    "_generated",
    "tmdb-endpoints.ts",
  );
  fs.writeFileSync(typesPath, typeContent, "utf8");
  console.log("✅ Generated tmdb-endpoints.ts");
}
