import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

interface DayHeaderProps {
  level: 2 | 3;
  /** Text at the end of the header. */
  trailing?: ReactNode;
  children: ReactNode;
}

/** The title of a group of cards on a screen, such as a day: a label over a hairline. */
export function DayHeader({ level, trailing, children }: DayHeaderProps) {
  return (
    <div css={[flex.between, styles.rule]}>
      <Heading level={level} css={[typeRole.label, styles.label]}>
        {children}
      </Heading>
      {trailing}
    </div>
  );
}

const styles = stylex.create({
  rule: {
    gap: rhythm.tight,
    paddingBlockEnd: space._1,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
  label: {
    fontWeight: font.weight_6,
  },
});
