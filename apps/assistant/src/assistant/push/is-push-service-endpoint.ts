/** The push services of the browsers: Chrome, Firefox, Safari and Edge. */
const PUSH_SERVICE_HOSTS = [
  "fcm.googleapis.com",
  ".push.services.mozilla.com",
  ".push.apple.com",
  ".notify.windows.com",
];

/**
 * True for an https URL at a browser's push service. The server sends to
 * the endpoint a browser gave, so any other host would let a user make the
 * server call an address of their choice.
 */
export function isPushServiceEndpoint(endpoint: string) {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port !== "" || url.username !== "") {
    return false;
  }
  return PUSH_SERVICE_HOSTS.some((host) =>
    host.startsWith(".") ? url.hostname.endsWith(host) : url.hostname === host,
  );
}
