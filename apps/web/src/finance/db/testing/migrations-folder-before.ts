import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { FINANCE_MIGRATIONS_FOLDER } from "../finance-migrations-folder.ts";

const journalSchema = z.object({
  entries: z.array(z.object({ tag: z.string() }).loose()),
});

/** A copy of the migrations folder that stops before the migration `tag`, with a way to remove it. */
export function migrationsFolderBefore(tag: string) {
  const folder = mkdtempSync(path.join(tmpdir(), "finance-migrations-"));
  cpSync(FINANCE_MIGRATIONS_FOLDER, folder, { recursive: true });
  const journalPath = path.join(folder, "meta", "_journal.json");
  const journal = journalSchema
    .loose()
    .parse(JSON.parse(readFileSync(journalPath, "utf8")));
  const end = journal.entries.findIndex((entry) => entry.tag === tag);
  writeFileSync(
    journalPath,
    JSON.stringify({ ...journal, entries: journal.entries.slice(0, end) }),
  );
  return {
    folder,
    remove: () => {
      rmSync(folder, { recursive: true, force: true });
    },
  };
}
