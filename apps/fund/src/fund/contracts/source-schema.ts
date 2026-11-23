import { z } from "zod";

/** A page an agent read. */
export const sourceSchema = z.object({ title: z.string(), url: z.string() });
