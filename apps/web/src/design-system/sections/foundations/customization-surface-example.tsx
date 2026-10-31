import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { Example } from "#src/design-system/example.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";

const STYLES = `import * as stylex from "@stylexjs/stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  days: { gap: rhythm.tight },
  day: {
    paddingBlock: space._3,
    paddingInline: space._4,
  },
});`;

export function CustomizationSurfaceExample() {
  return (
    <>
      <Example>
        <ol css={[stack.rows, styles.days]}>
          <li css={[cardSurface.base, styles.day]}>
            {t({ en: "Day 1: Arrive in Kyoto", zh: "第 1 天：抵达京都" })}
          </li>
          <li css={[cardSurface.base, styles.day]}>
            {t({ en: "Day 2: Arashiyama", zh: "第 2 天：岚山" })}
          </li>
        </ol>
      </Example>
      <UsageSnippet label={t({ en: "Styles", zh: "样式" })} code={STYLES} />
    </>
  );
}

const styles = stylex.create({
  days: { gap: rhythm.tight },
  day: {
    paddingBlock: space._3,
    paddingInline: space._4,
  },
});
