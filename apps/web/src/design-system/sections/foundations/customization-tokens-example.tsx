import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Progress } from "@tuja/ui/components/progress";
import { progressTokens } from "@tuja/ui/components/progress.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import { Example } from "#src/design-system/example.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";

const STYLES = `import * as stylex from "@stylexjs/stylex";
import { progressTokens } from "@tuja/ui/components/progress.stylex";
import { color } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  outside: { inlineSize: "50%" },
  inside: {
    [progressTokens.indicatorColor]: color.fg,
  },
});`;

export function CustomizationTokensExample() {
  return (
    <>
      <Example>
        <Progress value={60} label={t({ en: "Packed", zh: "已打包" })} />
        <Progress
          value={60}
          label={t({ en: "Packed", zh: "已打包" })}
          css={[styles.outside, styles.inside]}
        />
      </Example>
      <UsageSnippet label={t({ en: "Styles", zh: "样式" })} code={STYLES} />
    </>
  );
}

const styles = stylex.create({
  outside: { inlineSize: "50%" },
  inside: {
    [progressTokens.indicatorColor]: color.fg,
  },
});
