import { ComponentProps, ComponentType, ReactNode } from "react";

const defaultComponents: {
  [tagName: string]: ComponentType<{ children?: ReactNode }>;
} = {
  strong: (props: ComponentProps<"strong">) => <strong {...props} />,
  em: (props: ComponentProps<"em">) => <em {...props} />,
  b: (props: ComponentProps<"b">) => <b {...props} />,
  i: (props: ComponentProps<"i">) => <i {...props} />,
  p: (props: ComponentProps<"p">) => <p {...props} />,
};

export function parseMessage(message: string) {
  const supportedTags = Object.keys(defaultComponents);
  const tokens = tokenize(message, supportedTags);

  return parseTokens(tokens, defaultComponents);
}

function tokenize(str: string, tagNames: string[]) {
  return str
    .replace(new RegExp(`</?(${tagNames.join("|")})[^>]*>`, "g"), "|$&|")
    .split("|");
}

const isTagBegin = (token: string) =>
  token.match(/^<[a-zA-Z]/) && token.endsWith(">");

const isTagEnd = (token: string) =>
  token.match(/^<\/[a-zA-Z]/) && token.endsWith(">");

const getTagBeginName = (token: string) =>
  token.match(/^<([a-zA-Z]+)[^>]*>/)?.[1];

const getTagEndName = (token: string) =>
  token.match(/^<\/([a-zA-Z]+)[^>]*>/)?.[1];

function parseTokens(tokens: string[], componentMap: typeof defaultComponents) {
  const parsed: ReactNode[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (isTagBegin(token)) {
      const tagName = getTagBeginName(token);
      const Component = tagName ? componentMap[tagName] : undefined;
      if (!Component) continue;

      let endIndex = i + 1;
      while (
        endIndex < tokens.length &&
        !isTagEnd(tokens[endIndex]) &&
        !getTagEndName(tokens[endIndex])
      ) {
        endIndex++;
      }

      const children = tokens.slice(i + 1, endIndex);
      parsed.push(
        <Component key={i}>{parseTokens(children, componentMap)}</Component>
      );

      i += endIndex - i;
      continue;
    }
    if (isTagEnd(token)) {
      continue;
    }
    parsed.push(token);
  }

  return parsed;
}
