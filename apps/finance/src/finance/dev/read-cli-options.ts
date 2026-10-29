import { parseArgs, type ParseArgsOptionsConfig } from "node:util";

/** Parses the options of a dev CLI. */
export function readCliOptions<T extends ParseArgsOptionsConfig>(options: T) {
  // pnpm passes the `--` of `pnpm finance:seed -- --years 2` on to the script.
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  return parseArgs({ args, options }).values;
}

/** A whole number from 1 to `max`, or undefined when the option is not given. */
export function readIntegerOption(
  name: string,
  value: string | undefined,
  max = Number.MAX_SAFE_INTEGER,
): number | undefined {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > max) {
    throw new Error(
      `--${name} takes a whole number from 1 to ${String(max)}, not ${value}`,
    );
  }
  return number;
}

export function readPortOption(name: string, value: string | undefined) {
  const port = readIntegerOption(name, value, 65_535);
  if (port === undefined) throw new Error(`Give --${name}.`);
  return port;
}
