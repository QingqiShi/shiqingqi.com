import { z } from "zod";
import { wireFields } from "./wire-fields.ts";

/**
 * The body of a push. Each mutation is checked against `mutationSchema` on
 * its own, so one bad mutation is rejected without failing the batch.
 */
export const pushRequestSchema = z.object({
  clientId: wireFields.id,
  mutations: z
    .array(
      z.object({
        id: wireFields.id,
        name: z.string(),
        args: z.unknown(),
      }),
    )
    .max(500),
});

export type PushRequest = z.infer<typeof pushRequestSchema>;
