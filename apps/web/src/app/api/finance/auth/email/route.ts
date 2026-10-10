import { authHandlers } from "#src/finance/auth/auth-handlers.ts";

export const GET = authHandlers.recoveryEmail;
export const POST = authHandlers.setRecoveryEmail;
