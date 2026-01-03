#!/usr/bin/env node

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "../..");

const ICON_SIZES = ["192x192", "512x512"];
const ASSETS_DIR = path.join(projectRoot, "src", "assets");
const PUBLIC_DIR = path.join(projectRoot, "public");
const MANIFEST_OUTPUT = path.join(projectRoot, "src", "app", "manifest.json");

/**
 * Compute MD5 hash of file content (first 8 chars)
 */
function getFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(content).digest("hex").slice(0, 8);
}

/**
 * Clean up old hashed icon files in public directory
 */
function cleanupOldHashedIcons() {
  const files = fs.readdirSync(PUBLIC_DIR);
  const hashedIconPattern = /^pwa-\d+x\d+\.[a-f0-9]{8}\.png$/;

  for (const file of files) {
    if (hashedIconPattern.test(file)) {
      const filePath = path.join(PUBLIC_DIR, file);
      fs.unlinkSync(filePath);
      console.log(`🗑️  Removed old hashed icon: ${file}`);
    }
  }
}

/**
 * Generate hashed icons and manifest
 */
function generateHashedIcons() {
  console.log("🚀 Generating hashed PWA icons...\n");

  // Clean up old hashed icons first
  cleanupOldHashedIcons();

  // Read manifest base
  const manifestBasePath = path.join(ASSETS_DIR, "manifest-base.json");
  const manifestBase = JSON.parse(fs.readFileSync(manifestBasePath, "utf8"));

  // Process each icon size
  const icons = [];

  for (const size of ICON_SIZES) {
    const sourceFile = `pwa-${size}.png`;
    const sourcePath = path.join(ASSETS_DIR, sourceFile);

    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source icon not found: ${sourcePath}`);
      process.exit(1);
    }

    // Compute hash
    const hash = getFileHash(sourcePath);
    const hashedFileName = `pwa-${size}.${hash}.png`;
    const destPath = path.join(PUBLIC_DIR, hashedFileName);

    // Copy file with hashed name
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Generated: ${hashedFileName}`);

    // Add to icons array
    icons.push({
      src: hashedFileName,
      sizes: size,
      type: "image/png",
    });

    // For 512x512, also add maskable version
    if (size === "512x512") {
      icons.push({
        src: hashedFileName,
        sizes: size,
        type: "image/png",
        purpose: "any maskable",
      });
    }
  }

  // Generate manifest with hashed icons
  const manifest = {
    ...manifestBase,
    icons,
  };

  // Write manifest
  fs.writeFileSync(MANIFEST_OUTPUT, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\n✅ Generated: src/app/manifest.json`);

  console.log("\n✨ PWA icons generation complete!");
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  generateHashedIcons();
}

export { generateHashedIcons };
