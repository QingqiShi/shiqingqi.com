/** A group of Finance routes that share one rate limit. */
export type FinanceRateLimitBucket =
  | "auth"
  | "verify-email"
  | "recovery-email-ip"
  | "recovery-email-address"
  | "sign-up-ip"
  | "sign-up-address"
  | "bank-sync"
  | "ai-suggest"
  | "ai-teach"
  | "report-regenerate";

export interface FinanceRateLimitResult {
  success: boolean;
  /** Unix-ms timestamp when the limit resets. */
  reset: number;
}

export type LimitFinanceRequest = (
  bucket: FinanceRateLimitBucket,
  identifier: string,
) => Promise<FinanceRateLimitResult>;

/** Gives back one request of `identifier` that `bucket` counted. */
export type RefundFinanceRequest = (
  bucket: FinanceRateLimitBucket,
  identifier: string,
) => Promise<void>;
