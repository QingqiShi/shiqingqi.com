import { z } from "zod";
import universeJson from "./universe.json";

const universeSchema = z.array(
  z.object({
    symbol: z.string(),
    name: z.string(),
    exchange: z.enum(["LSE", "US"]),
    currency: z.enum(["GBP", "USD"]),
    quoteScale: z.number().int().positive(),
    sector: z.string(),
    industry: z.string(),
    index: z.enum(["FTSE100", "SP100"]),
  }),
);

export type UniverseEntry = z.infer<typeof universeSchema>[number];

/** The stocks the fund may own, from `universe.json`. */
export const UNIVERSE: readonly UniverseEntry[] =
  universeSchema.parse(universeJson);
