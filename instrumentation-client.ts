// Client-side instrumentation for polyfills
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client

export async function register() {
  // Polyfill for dialog closedby attribute
  // Can be removed when all major browsers support it natively
  // Track support: https://caniuse.com/mdn-html_elements_dialog_closedby
  // Chrome 134+, Safari/Firefox: pending
  await import("dialog-closedby-polyfill");

  // Polyfill for Invoker Commands API (commandfor/command attributes)
  // Can be removed when all major browsers support it natively
  // Track support: https://caniuse.com/mdn-html_global_attributes_commandfor
  // Chrome 131+, Safari/Firefox: pending
  await import("invokers-polyfill");
}
