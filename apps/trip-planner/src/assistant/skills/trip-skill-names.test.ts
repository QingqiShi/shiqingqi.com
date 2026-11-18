import { describe, expect, it } from "vitest";
import {
  contentHash,
  decideAction,
  readFrontmatter,
  withRevision,
} from "./trip-skill-names.ts";

const skillMd = `---
name: resort-trip
description: Use when the trip is a stay at a resort.
---

# 度假村
`;

describe("the upload decision", () => {
  const files = [{ path: "SKILL.md", text: skillMd }];
  const hash = contentHash(files);
  const uploaded = readFrontmatter(withRevision(skillMd, hash)).description;

  it("creates a skill the account does not hold", () => {
    expect(decideAction(hash, null)).toBe("create");
  });

  it("leaves a skill alone when its newest version holds the same content", () => {
    expect(decideAction(hash, { latestDescription: uploaded })).toBe(
      "no change",
    );
  });

  it("uploads a new version when the content changed", () => {
    const changed = contentHash([{ path: "SKILL.md", text: `${skillMd}more` }]);
    expect(decideAction(changed, { latestDescription: uploaded })).toBe(
      "new version",
    );
  });

  it("uploads a new version over one with no revision", () => {
    expect(
      decideAction(hash, { latestDescription: "Use when the trip is a stay." }),
    ).toBe("new version");
  });

  it("does not depend on the order of the files", () => {
    const other = { path: "notes.md", text: "x" };
    expect(contentHash([other, ...files])).toBe(contentHash([...files, other]));
  });
});
