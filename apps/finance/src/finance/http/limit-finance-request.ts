import { makeRateLimiter } from "@tuja/server-clients/make-rate-limiter";
import "server-only";
import type {
  FinanceRateLimitBucket,
  LimitFinanceRequest,
  RefundFinanceRequest,
} from "./types.ts";

const limiter = makeRateLimiter<FinanceRateLimitBucket>({
  prefix: "finance",
  limits: {
    auth: { tokens: 10, window: "60 s" },
    "verify-email": { tokens: 5, window: "1 h" },
    "recovery-email-ip": { tokens: 10, window: "1 h" },
    "recovery-email-address": { tokens: 3, window: "1 h" },
    "sign-up-ip": { tokens: 10, window: "1 h" },
    "sign-up-address": { tokens: 3, window: "1 h" },
    "bank-sync": { tokens: 6, window: "1 h" },
    "ai-suggest": { tokens: 30, window: "60 s" },
    "ai-quick-add": { tokens: 60, window: "60 s" },
    "ai-teach": { tokens: 10, window: "60 s" },
    "report-regenerate": { tokens: 10, window: "60 s" },
  },
  // Off when Redis is not set up, and in end-to-end tests.
  isOn: () =>
    process.env.FINANCE_RATE_LIMIT !== "off" &&
    Boolean(process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL),
});

export const limitFinanceRequest: LimitFinanceRequest = limiter.limit;

export const refundFinanceRequest: RefundFinanceRequest = limiter.refund;
