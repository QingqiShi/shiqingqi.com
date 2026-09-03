import type { ReactNode, Ref } from "react";
import type { StyleProp } from "../../style-prop.ts";
import { Heading } from "../content/heading.tsx";

type CardTitleLevel = 2 | 3 | 4 | 5 | 6;

interface CardTitleProps {
  /**
   * Heading rank. Defaults to `3`; set it to keep the document outline honest
   * when the card sits under a deeper or shallower heading.
   */
  level?: CardTitleLevel;
  /** The card's title. */
  children: ReactNode;
  /**
   * Id applied to the rendered heading — the other half of the named-region
   * pattern, where the `Card` carries `aria-labelledby` pointing here.
   */
  id?: string;
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleProp;
  /** Ref to the rendered heading element. */
  ref?: Ref<HTMLHeadingElement>;
}

/**
 * The card's title, rendered as a real heading so a card is reachable by
 * heading navigation. Visual size stays fixed while `level` moves the rank.
 */
export function CardTitle({
  level = 3,
  id,
  css,
  ref,
  children,
}: CardTitleProps) {
  return (
    <Heading level={level} variant="h3" ref={ref} id={id} css={css}>
      {children}
    </Heading>
  );
}
