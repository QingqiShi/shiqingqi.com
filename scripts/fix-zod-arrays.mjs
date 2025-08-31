import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const zodFilePath = path.join(
  __dirname,
  "../src/_generated/tmdb-zod-schemas.ts",
);

if (!fs.existsSync(zodFilePath)) {
  console.error("Zod schemas file not found:", zodFilePath);
  process.exit(1);
}

let content = fs.readFileSync(zodFilePath, "utf8");

// Count broken arrays before fixing
const brokenArrayMatches = content.match(/zod\.array\(\)(?:\.optional\(\))?/g);
const brokenCount = brokenArrayMatches ? brokenArrayMatches.length : 0;

// Fix broken array schemas with generic unknown type
// This handles both optional and non-optional arrays
content = content.replace(
  /zod\.array\(\)\.optional\(\)/g,
  "zod.array(zod.unknown()).optional()",
);
content = content.replace(/zod\.array\(\)(?!\.)/g, "zod.array(zod.unknown())");

// Count fixed arrays
const fixedArrayMatches = content.match(
  /zod\.array\(zod\.unknown\(\)\)(?:\.optional\(\))?/g,
);
const fixedCount = fixedArrayMatches ? fixedArrayMatches.length : 0;

fs.writeFileSync(zodFilePath, content);

console.log(
  `✅ Fixed ${brokenCount} broken Zod array schemas (converted to zod.array(zod.unknown()))`,
);

if (brokenCount > 0 && fixedCount === brokenCount) {
  console.log("🎉 All broken array schemas have been fixed!");
} else if (brokenCount > 0) {
  console.log(
    `⚠️  Expected to fix ${brokenCount} arrays, but actually fixed ${fixedCount}`,
  );
} else {
  console.log("ℹ️  No broken array schemas found to fix");
}
