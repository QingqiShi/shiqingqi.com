import type { ReactNode, Ref } from "react";
import type { StyleProp } from "../../style-prop.ts";
import { Text } from "../content/text.tsx";

interface CardDescriptionProps {
  /** The supporting copy. */
  children: ReactNode;
  /**
   * Id applied to the rendered paragraph, e.g. for an `aria-describedby` on
   * the control the card is about.
   */
  id?: string;
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleProp;
  /** Ref to the rendered paragraph. */
  ref?: Ref<HTMLElement>;
}

/** Supporting copy beneath a `CardTitle`. */
export function CardDescription({
  id,
  css,
  ref,
  children,
}: CardDescriptionProps) {
  return (
    <Text variant="bodySmall" tone="muted" ref={ref} id={id} css={css}>
      {children}
    </Text>
  );
}
