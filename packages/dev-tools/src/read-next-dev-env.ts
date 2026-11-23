import { loadEnvConfig } from "@next/env";

/** The environment that `next dev` in `appDir` sees: the shell's variables, then the values in the env files. */
export function readNextDevEnv(
  appDir: string,
): Partial<Record<string, string>> {
  const shellEnv = { ...process.env };
  const { parsedEnv } = loadEnvConfig(
    appDir,
    true,
    { info: () => {}, error: console.error },
    true,
  );
  // loadEnvConfig writes into process.env, removes empty values, and marks
  // process.env as loaded. Put back the shell's environment, so that the
  // command gets it and loads the env files itself.
  for (const name of Object.keys(process.env)) {
    if (!(name in shellEnv)) Reflect.deleteProperty(process.env, name);
  }
  Object.assign(process.env, shellEnv);
  return { ...parsedEnv, ...shellEnv };
}
