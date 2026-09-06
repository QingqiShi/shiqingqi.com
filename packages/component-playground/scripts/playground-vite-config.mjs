import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { packageRoot } from "../src/adapter/design-system-sources.mjs";

const CONFIG_ID = "virtual:playground-config";
const CATALOGUE_ID = "virtual:playground-catalogue";

const REACT_PACKAGE = /^(react|react-dom)(\/.*)?$/;

/** Points the app's two virtual imports at the files this build was given. */
function playgroundInputs(configPath, cataloguePath) {
  return {
    name: "playground-inputs",
    enforce: "pre",
    resolveId(id) {
      if (id === CONFIG_ID) return configPath;
      if (id === CATALOGUE_ID) return cataloguePath;
      // A config is written outside this package, so React would otherwise
      // resolve against whatever node_modules sits above it.
      if (REACT_PACKAGE.test(id)) {
        return fileURLToPath(import.meta.resolve(id));
      }
      return null;
    },
  };
}

/** The whole Vite build for one playground, as an inline config. */
export function playgroundViteConfig({ configPath, cataloguePath, outDir }) {
  return {
    root: packageRoot,
    configFile: false,
    plugins: [react(), playgroundInputs(configPath, cataloguePath)],
    resolve: {
      alias: {
        "@tuja/component-playground": path.join(
          packageRoot,
          "src/core/index.ts",
        ),
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    build: {
      outDir,
      emptyOutDir: true,
      target: "es2022",
      cssCodeSplit: false,
      // Nothing may be fetched at runtime, so every asset is inlined.
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      reportCompressedSize: false,
      lib: {
        entry: path.join(packageRoot, "src/app/main.tsx"),
        formats: ["iife"],
        name: "ComponentPlayground",
        fileName: () => "playground.js",
        cssFileName: "playground",
      },
    },
  };
}
