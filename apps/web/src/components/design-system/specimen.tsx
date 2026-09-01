import * as stylex from "@stylexjs/stylex";
import type { StyleProp } from "@tuja/ui/style-prop";
import { space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { CodeBlock } from "./code/code-block.tsx";
import type { CodeToken } from "./code/code-token.ts";
import { SpecimenReveal } from "./specimen-reveal.tsx";

interface SpecimenProps {
  /** What this instance shows — "primary", "with description". Localised. */
  caption: string;
  /** The Babel plugin puts this in. Never write it by hand. */
  source?: readonly CodeToken[];
  /** StyleX overrides merged last, on the specimen cell. */
  css?: StyleProp;
  children: ReactNode;
}

/**
 * One instance of a component, its caption, and the source that makes it. It
 * renders as two siblings — the cell, then the panel — so an open snippet
 * spans the whole grid row. The `CodeBlock` renders where the `Specimen`
 * renders, so a server page keeps the colouring on the server. Without a
 * `source` the control does not appear.
 */
export function Specimen({ caption, source, css, children }: SpecimenProps) {
  return (
    <SpecimenReveal
      caption={caption}
      code={source ? <CodeBlock source={source} /> : null}
      css={css}
    >
      {children}
    </SpecimenReveal>
  );
}

interface SpecimenGridProps {
  /** StyleX overrides merged last — widen a track, or change the gap. */
  css?: StyleProp;
  children: ReactNode;
}

/**
 * A row of specimens that wraps. Each track takes at least 220px. The flow is
 * dense so that an open panel, which spans every track, drops below a whole row
 * rather than leaving the rest of that row empty.
 */
export function SpecimenGrid({ css, children }: SpecimenGridProps) {
  return <div css={[styles.grid, css]}>{children}</div>;
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gridAutoFlow: "dense",
    gap: space._3,
  },
});
