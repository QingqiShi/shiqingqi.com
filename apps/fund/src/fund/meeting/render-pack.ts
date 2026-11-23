import type { PackSection } from "./types.ts";

/** The message a seat reads: each section under its own heading, values as JSON. */
export function renderPack(sections: readonly PackSection[]): string {
  return sections
    .map(({ title, body }) => {
      const text =
        typeof body === "string"
          ? body
          : `\`\`\`json\n${JSON.stringify(body)}\n\`\`\``;
      return `# ${title}\n\n${text}`;
    })
    .join("\n\n");
}
