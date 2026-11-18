import { describeError } from "@tuja/server-db/describe-error";

/**
 * Logs a failed model call by the names, codes and HTTP statuses of its
 * errors. The errors themselves hold the prompt and the model's answer, which
 * are built from the Household's transactions.
 */
export function logModelFailure(label: string, error: unknown) {
  console.error(label, describeError(error));
}
