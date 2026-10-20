import { describe, expect, it } from "vitest";
import { readHomepageLinks } from "./read-homepage-links.ts";

const PAGE = new URL("https://www.example.com/en/home");

describe("readHomepageLinks", () => {
  it("reads attributes in any order, quoted or not, in any case", () => {
    const { icons, manifests } = readHomepageLinks(
      `<LINK SIZES=180x180 HREF=/a.png REL="Apple-Touch-Icon">
       <link href='b.png' rel='icon shortcut' sizes="16X16 192x96 any" />
       <link rel="apple-touch-icon-precomposed" href="c.png">
       <link
         rel="manifest"
         href="/site.webmanifest">`,
      PAGE,
    );
    expect(
      icons.map(({ url, size, source }) => [url.href, size, source]),
    ).toEqual([
      ["https://www.example.com/a.png", 180, "apple-touch-icon"],
      ["https://www.example.com/en/b.png", 96, "icon"],
      ["https://www.example.com/en/c.png", 180, "apple-touch-icon"],
    ]);
    expect(manifests.map(String)).toEqual([
      "https://www.example.com/site.webmanifest",
    ]);
  });

  it("decodes entities and honours the first base href", () => {
    const { icons } = readHomepageLinks(
      `<base href="https://cdn.example.com/assets/"><base href="/ignored/">
       <link rel="icon" href="i.png?a=1&amp;b=2&#x26;c=3" sizes="32x32">`,
      PAGE,
    );
    expect(icons[0]?.url.href).toBe(
      "https://cdn.example.com/assets/i.png?a=1&b=2&c=3",
    );
  });

  it("ignores comments, scripts, SVG, mask icons and other schemes", () => {
    const { icons } = readHomepageLinks(
      `<!-- <link rel="icon" href="/commented.png"> -->
       <script>document.write('<link rel="icon" href="/scripted.png">')</script>
       <link rel="icon" type="image/svg+xml" href="/v.png">
       <link rel="icon" href="/v.svg">
       <link rel="mask-icon" href="/mask.png">
       <link rel="icon" href="data:image/png;base64,AAAA">
       <link rel="icon" href="javascript:alert(1)">
       <link rel="stylesheet" href="/a.css">
       <link rel="icon" href="/favicon.ico" sizes="32x32">`,
      PAGE,
    );
    expect(icons.map(({ url, source }) => [url.pathname, source])).toEqual([
      ["/favicon.ico", "favicon-ico"],
    ]);
  });

  it("reads a link whose attribute value holds a '>'", () => {
    const { icons } = readHomepageLinks(
      `<link title="a > b" rel="icon" href="/x.png">`,
      PAGE,
    );
    expect(icons[0]?.url.pathname).toBe("/x.png");
  });
});
