/**
 * The WebAuthn relying party ID for a page at `hostname`: the host itself, so
 * that the passkeys of other apps under qingqi.dev do not show in the picker.
 */
export function passkeyRpId(hostname: string): string {
  return hostname;
}
