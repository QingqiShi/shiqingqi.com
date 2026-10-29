import { bankHandlers } from "#src/finance/bank/bank-handlers.ts";

export const PUT = bankHandlers.keepTransaction;
export const DELETE = bankHandlers.unkeepTransaction;
