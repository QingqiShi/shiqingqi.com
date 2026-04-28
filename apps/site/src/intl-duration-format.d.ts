// Remove once TypeScript ships Intl.DurationFormat types
// Tracking: https://github.com/microsoft/TypeScript/pull/63046
declare namespace Intl {
  interface DurationFormatOptions {
    style?: "long" | "short" | "narrow" | "digital";
    localeMatcher?: "best fit" | "lookup";
  }

  interface DurationInput {
    years?: number;
    months?: number;
    weeks?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
    microseconds?: number;
    nanoseconds?: number;
  }

  class DurationFormat {
    constructor(
      locales?: string | ReadonlyArray<string>,
      options?: DurationFormatOptions,
    );
    format(duration: DurationInput): string;
  }
}
