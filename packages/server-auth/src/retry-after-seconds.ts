/** The `Retry-After` seconds until a limit that resets at `reset` (Unix ms) allows a request again. */
export function retryAfterSeconds(reset: number, now: Date): number {
  return Math.max(1, Math.ceil((reset - now.getTime()) / 1000));
}
