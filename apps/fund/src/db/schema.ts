import { fundSchema } from "#src/fund/fund-schema.ts";
import { authSchema } from "./auth-schema.ts";

export * from "#src/fund/fund-schema.ts";
export * from "./auth-schema.ts";

export const schema = {
  ...authSchema,
  ...fundSchema,
};
