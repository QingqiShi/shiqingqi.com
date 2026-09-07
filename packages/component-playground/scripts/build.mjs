#!/usr/bin/env node
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { packageRoot } from "../src/adapter/design-system-sources.mjs";
import { buildAdapter } from "../src/adapter/index.mjs";
import { assertNoExternalRequests } from "./assert-no-external-requests.mjs";
import { playgroundViteConfig } from "./playground-vite-config.mjs";

const nodeRequire = createRequire(import.meta.url);

// A config is written outside this package, so React would otherwise resolve
// against whatever node_modules sits above it.
const pinReact = {
  name: "pin-react",
  setup(build) {
    build.onResolve({ filter: /^(react|react-dom)(\/.*)?$/ }, (args) => ({
      path: nodeRequire.resolve(args.path, { paths: [packageRoot] }),
    }));
  },
};

/**
 * Loads the config in Node and checks it against the design system, so an
 * unknown token or preset stops the build instead of reaching the browser.
 */
async function loadAndValidate(configPath, cataloguePath, tempDir) {
  const esbuild = await import("esbuild");
  const entry = path.join(tempDir, "validate-entry.mjs");
  const bundle = path.join(tempDir, "validate.mjs");
  const corePath = path.join(packageRoot, "src/core/index.ts");
  fs.writeFileSync(
    entry,
    [
      `import config from ${JSON.stringify(configPath)};`,
      `import catalogue from ${JSON.stringify(cataloguePath)};`,
      `import { assertValidConfig } from ${JSON.stringify(corePath)};`,
      "assertValidConfig(config, catalogue);",
      "export const { component, source } = config;",
    ].join("\n"),
  );
  await esbuild.build({
    entryPoints: [entry],
    outfile: bundle,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    jsx: "automatic",
    logLevel: "silent",
    alias: { "@tuja/component-playground": corePath },
    absWorkingDir: packageRoot,
    plugins: [pinReact],
  });
  return import(`${pathToFileURL(bundle).href}?t=${Date.now()}`);
}

function readDistFile(distDir, suffix) {
  const name = fs.readdirSync(distDir).find((file) => file.endsWith(suffix));
  return name ? fs.readFileSync(path.join(distDir, name), "utf8") : "";
}

function escapeForScript(code) {
  return code.replace(/<\/script>/gi, "<\\/script>");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error(
      "Usage: pnpm --filter @tuja/component-playground playground <config.playground.tsx>",
    );
    process.exit(1);
  }

  // pnpm runs a package script with the package as the working directory and
  // puts the caller's directory in INIT_CWD, so a relative config path given
  // from the monorepo root still resolves.
  const configPath = path.resolve(process.env.INIT_CWD ?? process.cwd(), input);
  if (!fs.existsSync(configPath)) {
    console.error(`No config at ${configPath}`);
    process.exit(1);
  }

  // Two builds can run at once, so every file this run writes goes in a
  // directory of its own.
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "component-playground-"),
  );
  try {
    const adapter = buildAdapter();
    const cataloguePath = path.join(tempDir, "catalogue.json");
    fs.writeFileSync(cataloguePath, JSON.stringify(adapter.catalogue));

    let loaded;
    try {
      loaded = await loadAndValidate(configPath, cataloguePath, tempDir);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
      return;
    }

    const distDir = path.join(tempDir, "dist");
    const { build } = await import("vite");
    await build({
      ...playgroundViteConfig({ configPath, cataloguePath, outDir: distDir }),
      logLevel: "warn",
    });

    const appJs = readDistFile(distDir, ".js");
    const appCss = readDistFile(distDir, ".css");

    // The Artifact host adds its own charset; the meta keeps the file readable
    // when it is opened from disk or a plain static server.
    const html = `<meta charset="utf-8">
<title>${escapeHtml(loaded.component)} playground</title>
<style>
${adapter.css}
${appCss}</style>
<div id="playground-root"></div>
<script>${escapeForScript(appJs)}</script>
`;

    const inertUrls = assertNoExternalRequests(html);

    const name = path
      .basename(configPath)
      .replace(/\.playground\.tsx$/, "")
      .replace(/\.tsx$/, "");
    const outputPath = path.join(path.dirname(configPath), `${name}.html`);
    fs.writeFileSync(outputPath, html);

    console.log(outputPath);
    console.log(
      `${Math.round(html.length / 1024)} kB total — font ${Math.round(adapter.fontDataUriBytes / 1024)} kB, script ${Math.round(appJs.length / 1024)} kB, token CSS ${Math.round(adapter.css.length / 1024)} kB`,
    );
    if (inertUrls.length > 0) {
      console.log(
        `No external requests. URLs the page carries as text only: ${[...new Set(inertUrls)].join(", ")}`,
      );
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

await main();
