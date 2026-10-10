/** A group of Finance routes that share one rate limit. */
export type FinanceRateLimitBucket =
  "auth" | "bank-sync" | "ai-suggest" | "report-regenerate" | "report-image";

export interface FinanceRateLimitResult {
  success: boolean;
  /** Unix-ms timestamp when the limit resets. */
  reset: number;
}

export type LimitFinanceRequest = (
  bucket: FinanceRateLimitBucket,
  identifier: string,
) => Promise<FinanceRateLimitResult>;
