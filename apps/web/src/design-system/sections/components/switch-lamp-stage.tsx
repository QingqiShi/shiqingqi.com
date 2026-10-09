"use client";

import * as stylex from "@stylexjs/stylex";
import { EffectContainer } from "@tuja/ui/components/effect-container";
import { Switch, type SwitchState } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { useEffectBoundary } from "@tuja/ui/hooks/use-effect-boundary";
import { useEffectContainer } from "@tuja/ui/hooks/use-effect-container";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";

/** A card the lamp lights and that casts a shadow: an Effect boundary. */
function Tile({ label }: { label: string }) {
  const ref = useEffectBoundary();
  return (
    <div ref={ref} css={[flex.center, corner.radius_2, styles.tile]}>
      <Text as="span" look="label">
        {label}
      </Text>
    </div>
  );
}

/**
 * A Switch with the Lamp effect inside an Effect container, with tiles
 * around it, so the light stays in the stage and the tiles cast shadows.
 */
export function SwitchLampStage() {
  const container = useEffectContainer();
  const [state, setState] = useState<SwitchState>("on");
  return (
    <div ref={container} css={[corner.radius_3, styles.stage]}>
      <EffectContainer value={container}>
        <div css={[flex.row, styles.row]}>
          <Tile label={t({ en: "Wi-Fi", zh: "无线网络" })} />
          <Switch
            effect="lamp"
            value={state}
            onChange={setState}
            aria-label={t({ en: "Lamp", zh: "灯" })}
          />
          <Tile label={t({ en: "Bluetooth", zh: "蓝牙" })} />
        </div>
        <div css={[flex.row, styles.row]}>
          <Tile label={t({ en: "Airplane mode", zh: "飞行模式" })} />
        </div>
      </EffectContainer>
    </div>
  );
}

const styles = stylex.create({
  stage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: rhythm.group,
    paddingBlock: space._9,
    paddingInline: space._5,
    backgroundColor: color.bgSurface,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  row: {
    justifyContent: "center",
    gap: rhythm.group,
  },
  tile: {
    paddingBlock: space._3,
    paddingInline: space._4,
    color: color.fg,
    backgroundColor: color.bgSurfaceRaised,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
});
