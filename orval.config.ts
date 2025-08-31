import { defineConfig } from "orval";

export default defineConfig({
  tmdb: {
    input: {
      target:
        "https://developer.themoviedb.org/openapi/64542913e1f86100738e227f",
    },
    output: {
      mode: "single",
      client: "zod",
      target: "./src/_generated/tmdb-zod-schemas.ts",
      fileExtension: ".ts",
      override: {
        zod: {
          strict: {
            query: true,
            param: true,
            response: true, // Try enabling strict mode for responses
          },
          generate: {
            query: true,
            param: true,
            body: false,
            response: true,
            header: false,
          },
          coerce: {
            query: ["string", "number", "boolean"],
          },
        },
      },
    },
  },
});
