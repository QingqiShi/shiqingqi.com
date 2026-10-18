import type { LabConfig, LabProps } from "./types.ts";

/**
 * Renders the Specimen with props the visitor paired in the Lab. A
 * component's own types rule out pairings the visitor is free to make — a
 * Button with neither children nor an aria-label. The Specimen's props are
 * therefore typed at runtime, from the generated documentation, and named
 * here.
 */
export function renderSpecimen<P>(config: LabConfig<P>, props: LabProps) {
  return config.render(props as P);
}
