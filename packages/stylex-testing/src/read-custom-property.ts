export interface CustomPropertyValue {
  light: string;
  dark: string;
}

function readDeclarationValue(css: string, start: number): string {
  let depth = 0;
  for (let index = start; index < css.length; index += 1) {
    const character = css[index];
    if (character === "(") depth += 1;
    else if (character === ")") depth -= 1;
    else if (depth === 0 && (character === ";" || character === "}")) {
      return css.slice(start, index).trim();
    }
  }
  return css.slice(start).trim();
}

function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") depth += 1;
    else if (character === ")") depth -= 1;
    else if (character === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

/**
 * Reads the value a compiled StyleX token resolves to in each colour scheme.
 * `reference` is the run-time value of the token, such as `color.textMain`.
 */
export function readCustomProperty(
  css: string,
  reference: string,
): CustomPropertyValue {
  const name = /^var\((--[^)]+)\)$/.exec(reference)?.[1];
  if (name === undefined) {
    throw new Error(`\`${reference}\` is not a \`var(--name)\` reference`);
  }

  const declaration = `${name}:`;
  const start = css.indexOf(declaration);
  if (start === -1) {
    throw new Error(`The compiled CSS declares no \`${name}\``);
  }

  const value = readDeclarationValue(css, start + declaration.length);
  const halves = /^light-dark\((.*)\)$/s.exec(value)?.[1];
  if (halves === undefined) return { light: value, dark: value };

  const parts = splitTopLevel(halves);
  if (parts.length !== 2) {
    throw new Error(`\`${name}\` is not a two-part light-dark(): ${value}`);
  }
  const [light, dark] = parts;
  return { light, dark };
}
