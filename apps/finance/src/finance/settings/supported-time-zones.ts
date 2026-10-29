/** Every IANA timezone this runtime knows, or none when it cannot list them. */
export function supportedTimeZones(): string[] {
  return typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : [];
}
