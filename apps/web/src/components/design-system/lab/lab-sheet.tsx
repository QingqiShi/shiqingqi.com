"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { color, controlSize, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Identifier } from "../identifier.tsx";
import { labEyebrow } from "./lab-eyebrow.stylex.ts";
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
    <div css={styles.sheet}>
      <LabVariantSection
        variants={variants}
        variantId={variantId}
        onSelect={onSelectVariant}
      />

      <section css={styles.section}>
        <Text as="span" look="caption" tone="subtle" css={labEyebrow.base}>
          {t({ en: "Props", zh: "属性" })}
        </Text>
        <div css={styles.rows}>
          {controls.map((control) => (
            <button
              key={control.name}
              type="button"
              css={[
                buttonReset.base,
                corner.radius_2,
                a11y.focusRing,
                transition.colors,
                styles.row,
              ]}
              onClick={() => {
                onOpenControl(control.name);
              }}
            >
              <span css={styles.propName}>
                <Identifier>{control.name}</Identifier>
              </span>
              <span css={styles.value}>
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
    display: "flex",
    flexDirection: "column",
    gap: space._4,
    padding: space._2,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
  },
  // No surface at rest: the caret says the row opens something, and a fill
  // behind every row would put nine cards on the Sheet.
  row: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    paddingBlock: controlSize._2,
    paddingInline: controlSize._3,
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgSurfaceSunken,
    },
    textAlign: "start",
    minInlineSize: 0,
  },
  propName: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.textMain,
    minInlineSize: 0,
  },
  value: {
    marginInlineStart: "auto",
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  caret: {
    display: "flex",
    flexShrink: 0,
    color: color.textSubtle,
  },
});
