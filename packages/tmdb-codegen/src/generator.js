#!/usr/bin/env node

import { parseArgs } from "node:util";
import path from "path";
import { apiRoutes } from "./api-routes.js";
import { endpoints } from "./endpoints.js";
import { generateApiRoutes } from "./generate-api-routes.js";
import { generateEndpointTypes } from "./generate-endpoint-types.js";
import { generateServerFunctions } from "./generate-server-functions.js";

const { values } = parseArgs({
  options: { root: { type: "string" } },
  strict: false,
});

const projectRoot = values.root
  ? path.resolve(values.root)
  : path.resolve(import.meta.dirname, "../../../apps/web");

// Main execution
function main() {
  console.log("🚀 Generating TMDB functions and API routes...");

  try {
    generateServerFunctions(projectRoot);
    generateApiRoutes(projectRoot);
    generateEndpointTypes(projectRoot);

    console.log(
      `✨ Generated ${endpoints.length} functions and ${apiRoutes.length} API routes successfully!`,
    );
  } catch (error) {
    console.error("❌ Error generating TMDB functions:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
