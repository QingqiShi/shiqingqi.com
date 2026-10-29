const SITE = "qingqi.dev";

/**
 * The WebAuthn relying party ID for a page at `hostname`. Finance moved from
 * qingqi.dev to a subdomain. The passkeys made before the move are bound to
 * qingqi.dev, so every host under it keeps that ID.
 */
export function passkeyRpId(hostname: string): string {
  return hostname === SITE || hostname.endsWith(`.${SITE}`) ? SITE : hostname;
}
