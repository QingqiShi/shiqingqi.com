import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { FormFooter } from "@tuja/ui/components/form-footer";
import { fill } from "@tuja/ui/primitives/layout.stylex";

/**
 * The plain form: Cancel, then Save, at the end of the line. The sticky form
 * needs a page that scrolls under it, which a tile does not have.
 */
export function FormFooterSpecimen() {
  return (
    <FormFooter css={fill.inline}>
      <Button size="sm" look="ghost">
        {t({ en: "Cancel", zh: "取消" })}
      </Button>
      <Button size="sm">{t({ en: "Save", zh: "保存" })}</Button>
    </FormFooter>
  );
}
