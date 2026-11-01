import "server-only";
import { getClassifierModel } from "#src/assistant/ai/get-classifier-model.ts";
import { getMailDeps } from "#src/assistant/mail/get-mail-deps.ts";
import type { OrganiseDeps } from "./organise-account.ts";

/** The organise dependencies of the running app, or null without the credential key or the Anthropic key. */
export function getOrganiseDeps(): OrganiseDeps | null {
  const mail = getMailDeps();
  const model = getClassifierModel();
  return mail && model ? { ...mail, model } : null;
}
