import type { CSSProperties, ReactNode } from "react";
import { createElement } from "react";

type SvgNode = {
  tag: string;
  attributes: Record<string, string>;
  children: Array<SvgNode | string>;
};

const TOKEN =
  /<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
const ATTRIBUTE = /([\w:-]+)="([^"]*)"/g;
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
};
/** Text in these elements is content; elsewhere a run of white space is only layout. */
const TEXT_ELEMENTS = new Set(["text", "tspan", "style"]);

function decode(text: string) {
  return text.replace(/&(?:amp|lt|gt|quot);/g, (entity) => ENTITIES[entity]);
}

function camelCase(name: string) {
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** Reads the markup that the pet code builds. It is well formed, so the reader is small. */
function parse(markup: string): SvgNode | null {
  const root: SvgNode = { tag: "", attributes: {}, children: [] };
  const open: SvgNode[] = [root];
  for (const match of markup.matchAll(TOKEN)) {
    const [token, closing, tag, rawAttributes, selfClosing] = match;
    const parent = open.at(-1) ?? root;
    if (!token.startsWith("<")) {
      const text = token;
      if (TEXT_ELEMENTS.has(parent.tag) || text.trim() !== "") {
        parent.children.push(decode(text));
      }
      continue;
    }
    if (closing === "/") {
      open.pop();
      continue;
    }
    const attributes: Record<string, string> = {};
    for (const [, name, value] of rawAttributes.matchAll(ATTRIBUTE)) {
      attributes[name] = decode(value);
    }
    const node: SvgNode = { tag, attributes, children: [] };
    parent.children.push(node);
    if (selfClosing !== "/") open.push(node);
  }
  const [first] = root.children;
  return typeof first === "object" ? first : null;
}

function styleOf(value: string) {
  const style: Record<string, string> = {};
  for (const declaration of value.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon < 0) continue;
    style[camelCase(declaration.slice(0, colon).trim())] = declaration
      .slice(colon + 1)
      .trim();
  }
  return style satisfies CSSProperties;
}

function propsOf(attributes: Record<string, string>) {
  const props: Record<string, string | CSSProperties> = {};
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "class") props.className = value;
    else if (name === "style") props.style = styleOf(value);
    else if (name.startsWith("aria-") || name.startsWith("data-")) {
      props[name] = value;
    } else props[camelCase(name)] = value;
  }
  return props;
}

function toElement(node: SvgNode | string): ReactNode {
  if (typeof node === "string") return node;
  return createElement(
    node.tag,
    propsOf(node.attributes),
    ...node.children.map(toElement),
  );
}

/** Draws SVG markup from the pet code as React elements, so that it renders on the server too. */
export function SvgMarkup({ markup }: { markup: string }) {
  const node = parse(markup);
  return node === null ? null : toElement(node);
}
