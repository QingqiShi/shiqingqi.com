import * as stylex from "@stylexjs/stylex";
import { SpriteEditor } from "#src/components/sprite-editor/sprite-editor.tsx";
import { t } from "#src/i18n.ts";

export default function Page() {
  return (
    <>
      <h1 css={styles.srOnly}>
        {t({ en: "Sprite Editor", zh: "像素编辑器" })}
      </h1>
      <SpriteEditor />
    </>
  );
}

const styles = stylex.create({
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
});
