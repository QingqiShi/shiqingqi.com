import type { ReactNode, Ref } from "react";
import type { StyleProp } from "../../types.ts";
import { Text } from "../content/text.tsx";

interface CardDescriptionProps {
  /**
   * The supporting copy.
   *
   * @zh 补充说明文案。
   */
  children: ReactNode;
  /**
   * Id applied to the rendered paragraph, e.g. for an `aria-describedby` on
   * the control the card is about.
   *
   * @zh 为渲染的段落设置的 id，例如供卡片所描述控件的 `aria-describedby` 使用。
   */
  id?: string;
  /**
   * StyleX overrides, composed last so a caller can win over the defaults.
   *
   * @zh 最后合成的 StyleX 覆盖样式，使调用方可覆盖默认值。
   */
  css?: StyleProp;
  /**
   * Ref to the rendered paragraph.
   *
   * @zh 指向渲染的段落的 ref。
   */
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
    <Text look="bodySmall" tone="muted" ref={ref} id={id} css={css}>
      {children}
    </Text>
  );
}
