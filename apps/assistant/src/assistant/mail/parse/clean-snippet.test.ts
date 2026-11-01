import { describe, expect, it } from "vitest";
import { cleanSnippet } from "./clean-snippet.ts";
import { htmlToText } from "./html-to-text.ts";

describe("cleanSnippet", () => {
  it("keeps the new text of a reply and drops the quoted mail", () => {
    expect(
      cleanSnippet(
        "Sounds good,  see you then.\n\n\n\nOn Sat, 31 Oct 2026, Ann <ann@example.com> wrote:\n> Shall we meet at 10?",
      ),
    ).toBe("Sounds good, see you then.");
  });

  it("drops the invisible padding of a preview text", () => {
    expect(cleanSnippet("\u200c\u034f \u200c\u034f Your order shipped")).toBe(
      "Your order shipped",
    );
  });
});

describe("htmlToText", () => {
  it("keeps the visible text, one block per line, without styles, scripts or hidden preheaders", () => {
    const html = `<html><head><style>p{color:red}</style></head><body>
      <div style="display:none">Hidden preheader</div>
      <p>Your flight&nbsp;BA&#32;117 leaves at <b>10:05</b>.</p>
      <table><tr><td>Gate</td><td>B&amp;12</td></tr></table>
      <script>track()</script>Thanks<br>Team</body></html>`;

    expect(cleanSnippet(htmlToText(html))).toBe(
      "Your flight BA 117 leaves at 10:05.\n\nGate B&12\n\nThanks\nTeam",
    );
  });

  it("drops every element nested inside a hidden one", () => {
    expect(
      htmlToText(
        '<div style="display: none"><div>Hidden</div><p>Also hidden</p></div>Shown',
      ),
    ).toBe("Shown");
  });
});
