import type { ReactNode, Ref } from "react";
import type { StyleProp } from "../../types.ts";
import { Heading } from "../content/heading.tsx";

interface CardTitleProps {
  /**
   * Heading rank. Defaults to `3`; set it to keep the document outline honest
   * when the card sits under a deeper or shallower heading.
   *
   * @zh 标题层级；当卡片处于比通常更深或更浅的标题层级下时，设置它以保持文档大纲的正确性。
   */
  level?: 2 | 3 | 4 | 5 | 6;
  /**
   * The card's title.
   *
   * @zh 卡片的标题。
   */
  children: ReactNode;
  /**
   * Id applied to the rendered heading — the other half of the named-region
   * pattern, where the `Card` carries `aria-labelledby` pointing here.
   *
   * @zh 为渲染的标题元素设置的 id——具名区域模式的另一半，`Card` 会通过 `aria-labelledby` 指向此处。
   */
  id?: string;
  /**
   * StyleX overrides, composed last so a caller can win over the defaults.
   *
   * @zh 最后合成的 StyleX 覆盖样式，使调用方可覆盖默认值。
   */
  css?: StyleProp;
  /**
   * Ref to the rendered heading element.
   *
   * @zh 指向渲染的标题元素的 ref。
   */
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
    <Heading level={level} look="h3" ref={ref} id={id} css={css}>
      {children}
    </Heading>
  );
}
