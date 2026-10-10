import { after } from "next/server";
import "server-only";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { getFinanceEmailSender } from "../email/get-finance-email-sender.ts";
import {
  limitFinanceRequest,
  refundFinanceRequest,
} from "../http/limit-finance-request.ts";
import { isAllowedFinanceOrigin } from "./is-allowed-finance-origin.ts";
import { makeAuthHandlers } from "./make-auth-handlers.ts";

export const authHandlers = makeAuthHandlers({
  getDb: () => (isFinanceConfigured() ? getFinanceDb() : null),
  now: () => new Date(),
  authSecret: () => process.env.FINANCE_AUTH_SECRET,
  setupSecret: () => process.env.FINANCE_SETUP_SECRET,
  limitRequest: limitFinanceRequest,
  refundRequest: refundFinanceRequest,
  isAllowedOrigin: isAllowedFinanceOrigin,
  emailSender: getFinanceEmailSender,
  afterResponse: after,
});
