/**
 * Downloads the licensed fonts into the `public/fonts` folder of the app in
 * the working directory. Without the token it warns and does nothing, and the
 * app shows the fallback font. With `--dev` it reads the env files that
 * `next dev` reads, and without it the env files that `next build` reads.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const TOKEN_VARIABLE = "LICENSED_FONTS_READ_WRITE_TOKEN";

// The licence does not let this public repository hold the font files, so
// they come from a private Vercel Blob store. Browsers keep each file for one
// year. When a file changes, upload it to a new folder and change this name.
const FONT_FOLDER = "haffer-1";

const FONT_SHA256 = {
  "Haffer-Regular.woff2":
    "c8e35f9f549c52e4728e9f36c5774110488114b7fbbee2651adde26ce4e81d4d",
  "Haffer-RegularItalic.woff2":
    "c79f9f81e8823b4341c0618851591a5ec0ca48b3f2fca6f9ad40454bb1d48cbf",
  "Haffer-SemiBold.woff2":
    "7146ae589af156d097aab431991b85c56ed43dc6ec01c99ba56744f728b9413f",
};

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isCurrent(path, expectedHash) {
  return existsSync(path) && sha256(readFileSync(path)) === expectedHash;
}

function readToken(appDir, dev) {
  const appRequire = createRequire(join(appDir, "package.json"));
  const nextRequire = createRequire(appRequire.resolve("next/package.json"));
  const { loadEnvConfig } = nextRequire("@next/env");
  loadEnvConfig(appDir, dev, { info() {}, error: console.error });
  return process.env[TOKEN_VARIABLE];
}

async function fetchLicensedFonts(appDir, dev) {
  const directory = join(appDir, "public", "fonts", FONT_FOLDER);
  const missing = Object.entries(FONT_SHA256).filter(
    ([name, hash]) => !isCurrent(join(directory, name), hash),
  );
  if (missing.length === 0) return;

  const token = readToken(appDir, dev);
  if (!token) {
    console.warn(
      `⚠ ${TOKEN_VARIABLE} is not set, so the licensed fonts were not downloaded and text uses the fallback font. AGENTS.md says how to get them.`,
    );
    return;
  }

  // A Blob read-write token has the form vercel_blob_rw_<storeId>_<secret>.
  const storeId = token.split("_")[3]?.toLowerCase();
  if (!storeId) throw new Error(`${TOKEN_VARIABLE} is not a Blob token.`);

  mkdirSync(directory, { recursive: true });
  await Promise.all(
    missing.map(async ([name, expectedHash]) => {
      const url = `https://${storeId}.private.blob.vercel-storage.com/${FONT_FOLDER}/${name}`;
      const response = await globalThis.fetch(url, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Downloading ${name} failed: ${response.status}.`);
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (sha256(bytes) !== expectedHash) {
        throw new Error(`${name} from the Blob store has the wrong hash.`);
      }
      writeFileSync(join(directory, name), bytes);
    }),
  );
  console.log(`Downloaded ${missing.length} licensed font file(s).`);
}

await fetchLicensedFonts(process.cwd(), process.argv.includes("--dev"));
