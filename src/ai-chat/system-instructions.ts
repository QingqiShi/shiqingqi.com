import { readFileSync } from "fs";
import { join } from "path";
import type { SupportedLocale } from "#src/types.ts";

let template: string | null = null;

function getTemplate(): string {
  if (!template) {
    const instructionsPath = join(
      process.cwd(),
      "src",
      "ai-chat",
      "system-instructions.md",
    );
    template = readFileSync(instructionsPath, "utf-8");
  }
  return template;
}

export function getChatSystemInstructions(locale: SupportedLocale): string {
  const currentDate = new Date().toISOString().split("T")[0];

  return getTemplate()
    .replaceAll("{currentDate}", currentDate)
    .replaceAll("{locale}", locale);
}
