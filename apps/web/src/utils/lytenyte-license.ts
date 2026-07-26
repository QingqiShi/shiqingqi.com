import { activateLicense } from "@1771technologies/lytenyte-pro";

/**
 * Activates the LyteNyte Grid PRO licence.
 *
 * Validation is offline — the key encodes the licence term and is checked
 * against the build date of the grid itself, with no network request — so the
 * key necessarily ships inside the client bundle and `NEXT_PUBLIC_` is the
 * correct prefix. Set `NEXT_PUBLIC_LYTENYTE_LICENSE_KEY` in the environment
 * (`apps/web/.env.local` locally, project env vars on Vercel).
 *
 * A missing key is not fatal: the grid stays fully functional and paints an
 * "used for evaluation" watermark instead, which is what we want in forks and
 * preview environments that have no access to the licence.
 *
 * Importing this module is the activation — it must run before the first grid
 * render, so import it for side effects at the top of any module that renders
 * a grid. `activateLicense` is cheap and idempotent, so repeat imports across
 * entry points are fine.
 */
const licenseKey = process.env.NEXT_PUBLIC_LYTENYTE_LICENSE_KEY;
// Truthiness, not `!== undefined`: a declared-but-blank env var arrives as `""`,
// and handing that to `activateLicense` prints its multi-line "Invalid license
// key" banner to every visitor's console. A blank key is a missing key.
const activated = licenseKey ? activateLicense(licenseKey) : false;

// LyteNyte treats localhost as licensed and only logs for a key it can parse
// but rejects, so a missing, misnamed or expired variable is silent right up
// until the watermark appears on the deployed site. Say so where it can be
// seen: the browser console of the environment that is actually affected.
if (!activated && process.env.NODE_ENV === "production") {
  console.warn(
    "LyteNyte Grid PRO: NEXT_PUBLIC_LYTENYTE_LICENSE_KEY is missing or invalid — the grid will render an evaluation watermark.",
  );
}
