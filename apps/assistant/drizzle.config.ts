import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/assistant/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.ASSISTANT_DATABASE_URL_UNPOOLED ??
      process.env.ASSISTANT_DATABASE_URL ??
      "",
  },
});
