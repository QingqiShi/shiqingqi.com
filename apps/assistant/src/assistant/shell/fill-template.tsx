import type { ReactNode } from "react";

/**
 * Puts the parts of a sentence into a template such as "Moved {mail} to {to}".
 * Each part is isolated, because a mail header can hold text that runs the
 * other way.
 */
export function fillTemplate(
  template: string,
  parts: Record<string, ReactNode>,
) {
  return template.split(/(\{\w+\})/).map((piece, index) => {
    const name = /^\{(\w+)\}$/.exec(piece)?.[1];
    return name && name in parts ? <bdi key={index}>{parts[name]}</bdi> : piece;
  });
}
