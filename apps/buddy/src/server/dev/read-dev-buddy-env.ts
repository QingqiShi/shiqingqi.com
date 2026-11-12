import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { getLocalBuddyDefaults } from "./get-local-buddy-defaults.ts";

const APP_DIR = path.resolve(import.meta.dirname, "../../..");

type Env = Partial<Record<string, string>>;

/** The environment that `next dev` sees: the shell's variables, then the values in the env files. */
function readNextDevEnv(appDir = APP_DIR): Env {
  const shellEnv = { ...process.env };
  const { parsedEnv } = loadEnvConfig(
    appDir,
    true,
    { info: () => {}, error: console.error },
    true,
  );
  // loadEnvConfig writes into process.env, removes empty values, and marks
  // process.env as loaded. Put back the shell's environment, so that `next dev`
  // gets it and loads the env files itself.
  for (const name of Object.keys(process.env)) {
    if (!(name in shellEnv)) Reflect.deleteProperty(process.env, name);
  }
  Object.assign(process.env, shellEnv);
  return { ...parsedEnv, ...shellEnv };
}

/**
 * The Buddy settings of `next dev` in apps/buddy. `defaults` are the local
 * settings that it adds, or null when the developer set
 * `BUDDY_DATABASE_URL`. An empty `databaseUrl` means the app has no database.
 */
export function readDevBuddyEnv(databasePort: number) {
  const env = readNextDevEnv();
  const defaults = getLocalBuddyDefaults(env, databasePort);
  const settings = { ...env, ...defaults };
  return {
    defaults,
    databaseUrl: settings.BUDDY_DATABASE_URL ?? "",
  };
}
