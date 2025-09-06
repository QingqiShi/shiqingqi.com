#!/usr/bin/env node

/**
 * Post-process generated Zod schemas to make them OpenAI Structured Outputs compatible
 * Replaces .optional() with .nullable().optional() for OpenAI API compatibility
 */

const fs = require("fs");
const path = require("path");

const zodFilePath = path.join(__dirname, "../src/_generated/tmdb-zod.ts");

try {
  let content = fs.readFileSync(zodFilePath, "utf8");

  // Replace .optional() with .nullable().optional()
  // but avoid replacing .nullable().optional() that might already exist
  content = content.replace(
    /(?<!\.nullable\(\))\.optional\(\)/g,
    ".nullable().optional()",
  );

  fs.writeFileSync(zodFilePath, content);
  console.log("✅ Fixed Zod schemas for OpenAI compatibility");
} catch (error) {
  console.error("❌ Failed to fix Zod schemas:", error.message);
  process.exit(1);
}
