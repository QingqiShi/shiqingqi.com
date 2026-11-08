import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";

/** Asks for the code that the Mac shows, for when the link did not carry it. A plain GET form, so it needs no script. */
export function CodeForm({ action }: { action: string }) {
  return (
    <form method="get" action={action} css={stack.item}>
      <TextField
        name="code"
        label={t({ en: "Code on your Mac", zh: "Mac 上显示的代码" })}
        placeholder="BCDF-GHJK"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        size="lg"
      />
      <Button type="submit" look="primary" size="lg" css={styles.wide}>
        {t({ en: "Continue", zh: "继续" })}
      </Button>
    </form>
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
