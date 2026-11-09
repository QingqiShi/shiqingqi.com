import "server-only";
import { getOriginFromHeaders } from "@tuja/server-auth/get-request-origin";
import { headers } from "next/headers";
import { isAllowedAssistantOrigin } from "#src/assistant/auth/is-allowed-assistant-origin.ts";
import {
  makeMailImageLinks,
  type MailImageLinks,
} from "./make-mail-image-links.ts";

/** The image links of the page being rendered, at the origin the browser used; null without `ASSISTANT_AUTH_SECRET` or at a Host the app does not accept. */
export async function getMailImageLinks(): Promise<MailImageLinks | null> {
  const secret = process.env.ASSISTANT_AUTH_SECRET;
  const requestHeaders = await headers();
  if (!secret || !requestHeaders.get("Host")) return null;
  const origin = getOriginFromHeaders(
    requestHeaders,
    new URL("https://invalid"),
  );
  if (!isAllowedAssistantOrigin(origin)) return null;
  return makeMailImageLinks(origin, secret, new Date());
}
