import { describe, expect, it } from "vitest";
import { splitLinks } from "./split-links.ts";

describe("splitLinks", () => {
  it("makes each web address a part and leaves the sentence's punctuation in the text", () => {
    expect(
      splitLinks("Form at https://gov.uk/apply?id=4. Then http://a.co/x, done"),
    ).toEqual([
      { text: "Form at " },
      { text: "https://gov.uk/apply?id=4", href: "https://gov.uk/apply?id=4" },
      { text: ". Then " },
      { text: "http://a.co/x", href: "http://a.co/x" },
      { text: ", done" },
    ]);
  });

  it("keeps a closing bracket that the address opened, and stops at Chinese text", () => {
    expect(
      splitLinks(
        "(see https://en.wikipedia.org/wiki/Tea_(drink)) 见https://a.cn/p。谢谢",
      ),
    ).toEqual([
      { text: "(see " },
      {
        text: "https://en.wikipedia.org/wiki/Tea_(drink)",
        href: "https://en.wikipedia.org/wiki/Tea_(drink)",
      },
      { text: ") 见" },
      { text: "https://a.cn/p", href: "https://a.cn/p" },
      { text: "。谢谢" },
    ]);
  });

  it("gives plain text as one part", () => {
    expect(splitLinks("No address here")).toEqual([
      { text: "No address here" },
    ]);
  });
});
