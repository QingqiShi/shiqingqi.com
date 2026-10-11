import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { FinanceEmail, FinanceEmailSender } from "./types.ts";

const outboxEmailSchema = z.object({
  to: z.string(),
  subject: z.string(),
  text: z.string(),
  html: z.string(),
}) satisfies z.ZodType<FinanceEmail>;

/** Writes each email as a JSON file in `dir` and sends nothing. For dev and tests, which read the files back with `readOutbox`. */
export function makeOutboxEmailSender(dir: string): FinanceEmailSender {
  return {
    async send(email) {
      await mkdir(dir, { recursive: true });
      const order = process.hrtime.bigint().toString().padStart(20, "0");
      await writeFile(
        path.join(dir, `${order}-${randomUUID()}.json`),
        JSON.stringify(email),
      );
    },
  };
}

/** Every email in the outbox, oldest first. Empty when the outbox does not exist. */
export async function readOutbox(dir: string): Promise<FinanceEmail[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  return Promise.all(
    names
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map(async (name) =>
        outboxEmailSchema.parse(
          JSON.parse(await readFile(path.join(dir, name), "utf8")),
        ),
      ),
  );
}
