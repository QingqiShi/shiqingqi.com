// Client-side instrumentation for polyfills
// Runs after HTML loads but before React hydration
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client

// Polyfill for dialog closedby attribute
// Can be removed when all major browsers support it natively
// Track support: https://caniuse.com/mdn-html_elements_dialog_closedby
// Chrome 134+, Safari/Firefox: pending
import "dialog-closedby-polyfill";

// Polyfill for Invoker Commands API (commandfor/command attributes)
// Can be removed when all major browsers support it natively
// Track support: https://caniuse.com/mdn-html_global_attributes_commandfor
// Chrome 135+, Safari 26+, Firefox: pending
import "invokers-polyfill";
