import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/auth-schema.ts", "./src/fund/fund-schema.ts"],
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.FUND_DATABASE_URL_UNPOOLED ??
      process.env.FUND_DATABASE_URL ??
      "",
  },
});
