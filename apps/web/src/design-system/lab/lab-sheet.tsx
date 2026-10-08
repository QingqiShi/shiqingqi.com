"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, controlSize, font, space } from "@tuja/ui/tokens.stylex";
import { Identifier } from "#src/design-system/identifier.tsx";
import { t } from "#src/i18n.ts";
import { LabVariantSection } from "./lab-variant-section.tsx";
import type { LabControlModel, LabProps, LabVariantChoice } from "./types.ts";
import { unquote } from "./unquote.ts";

interface LabSheetProps {
  variants: readonly LabVariantChoice[];
  controls: readonly LabControlModel[];
  /** The Variant the props came from. */
  variantId: string;
  props: LabProps;
  onSelectVariant: (variantId: string) => void;
  onOpenControl: (prop: string) => void;
}

/** What a row reports, so a visitor reads the prop without opening it. */
function currentValue(
  control: LabControlModel,
  props: LabProps,
  defaultLabel: string,
) {
  const raw = props[control.name];
  if (control.samples !== undefined) {
    const id = typeof raw === "string" ? raw : control.samples[0]?.id;
    return control.samples.find((sample) => sample.id === id)?.label ?? "";
  }
  if (control.kind === "boolean") return raw === true ? "true" : "false";
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "string") return raw;
  return unquote(control.defaultValue) ?? defaultLabel;
}

/**
 * What the Sheet carries below `md`: the Variants, then one row per prop. A
 * row opens that prop's control in the bar, so the visitor tunes it with the
 * Specimen in view rather than behind the Sheet.
 */
export function LabSheet({
  variants,
  controls,
  variantId,
  props,
  onSelectVariant,
  onOpenControl,
}: LabSheetProps) {
  const defaultLabel = t({ en: "Default", zh: "默认" });

  return (
    <div css={[stack.group, styles.sheet]}>
      <LabVariantSection
        variants={variants}
        variantId={variantId}
        onSelect={onSelectVariant}
      />

      <section css={stack.tight}>
        <Text as="span" look="caption" tone="muted" css={typeRole.overline}>
          {t({ en: "Props", zh: "属性" })}
        </Text>
        <div css={stack.tight}>
          {controls.map((control) => (
            <button
              key={control.name}
              type="button"
              css={[
                buttonReset.base,
                corner.radius_2,
                transition.colors,
                styles.row,
              ]}
              onClick={() => {
                onOpenControl(control.name);
              }}
            >
              <span css={[typeRole.bodySmall, styles.propName]}>
                <Identifier>{control.name}</Identifier>
              </span>
              <span css={[typeRole.caption, styles.value]}>
                {currentValue(control, props, defaultLabel)}
              </span>
              <span css={styles.caret}>
                <CaretRightIcon aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

const styles = stylex.create({
  sheet: {
    padding: space._5,
  },
  // No surface at rest: the caret says the row opens something, and a fill
  // behind every row would put nine cards on the Sheet.
  row: {
    display: "flex",
    alignItems: "center",
    gap: controlSize._2,
    paddingBlock: controlSize._2,
    paddingInline: controlSize._3,
    backgroundColor: {
      default: "transparent",
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgSurfaceSunken,
      },
    },
    textAlign: "start",
    minInlineSize: 0,
  },
  propName: {
    fontFamily: font.familyMono,
    color: color.fg,
    minInlineSize: 0,
  },
  value: {
    marginInlineStart: "auto",
    fontFamily: font.familyMono,
    color: color.fgMuted,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  caret: {
    display: "flex",
    flexShrink: 0,
    color: color.fgMuted,
  },
});
