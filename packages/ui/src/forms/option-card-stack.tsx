import type { ComponentProps } from "react";
import type { StyleProp } from "../types.ts";
import { groupStyles } from "./option-card-group.stylex.ts";
import { optionCardGroupMarker } from "./option-card.stylex.ts";
import type {
  OptionCardDescriptionLines,
  OptionCardLook,
} from "./option-card.tsx";

type OptionCardStackProps = Omit<
  ComponentProps<"div">,
  "className" | "style"
> & {
  /**
   * A stack of full-width rows, or a grid of centred tiles that wraps at
   * 9rem per card.
   *
   * @zh 撑满宽度的行式堆叠，或每张卡片最小 9rem、自动换行的居中方块网格。
   */
  look?: OptionCardLook;
  /**
   * Makes every card the same height: the label truncates to one line, and
   * the description clamps to this many lines and keeps their height when it
   * is shorter. A row then centres its selection mark. Leave it out for cards
   * of natural height, whose marks sit in the top-end corner.
   *
   * @zh 让所有卡片等高：标签截断为一行，说明最多显示这么多行，较短时也保留这些行的高度。此时行式卡片的选中标记垂直居中。不传则卡片保持自然高度，选中标记位于右上角。
   */
  descriptionLines?: OptionCardDescriptionLines;
  /**
   * StyleX overrides merged over the stack — composed last so a caller wins.
   *
   * @zh 合并到该堆叠上的 StyleX 覆盖样式，最后合成，使调用方可覆盖。
   */
  css?: StyleProp;
};

/**
 * Lays out `OptionCard`s that you render yourself, as `OptionCardGroup` lays
 * out its own. It adds no role: give it `role="radiogroup"` and a name when its
 * cards are one choice.
 */
export function OptionCardStack({
  look = "row",
  descriptionLines,
  children,
  css,
  ref,
  ...restProps
}: OptionCardStackProps) {
  return (
    <div
      {...restProps}
      ref={ref}
      data-description-lines={descriptionLines}
      css={[
        optionCardGroupMarker,
        look === "row" ? groupStyles.rows : groupStyles.tile,
        descriptionLines !== undefined && groupStyles.equalRows,
        css,
      ]}
    >
      {children}
    </div>
  );
}
