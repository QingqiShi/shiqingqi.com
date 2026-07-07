import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { SpriteEditor } from "#src/components/sprite-editor/sprite-editor.tsx";
import { t } from "#src/i18n.ts";

export default function Page() {
  return (
    <>
      <h1 css={a11y.srOnly}>{t({ en: "Sprite Editor", zh: "像素编辑器" })}</h1>
      <SpriteEditor />
    </>
  );
}
