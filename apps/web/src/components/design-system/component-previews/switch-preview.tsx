import * as stylex from "@stylexjs/stylex";
import { Switch } from "@tuja/ui/components/switch";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { previewLayout } from "./preview.stylex.ts";

/**
 * On and off. The indeterminate state is what makes this control unusual, but it
 * is also the rarest, and a third track here mostly adds width; the switch page
 * shows all three together, where the comparison is the point.
 *
 * Held in the controlled form with no `onChange`, which is safe because the
 * specimen is inert and nothing can toggle it.
 */
export function SwitchPreview() {
  return (
    <div css={[previewLayout.row, styles.row]}>
      <Switch value="on" aria-label={t({ en: "On", zh: "开启" })} />
      <Switch value="off" aria-label={t({ en: "Off", zh: "关闭" })} />
    </div>
  );
}

const styles = stylex.create({
  row: {
    gap: space._2,
  },
});
