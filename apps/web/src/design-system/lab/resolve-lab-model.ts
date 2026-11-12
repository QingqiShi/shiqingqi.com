import type { SupportedLocale } from "@tuja/i18n/types";
import type { PropDoc } from "@tuja/props-codegen/types";
import type { LabConfig, LabControlModel, LabVariantChoice } from "./types.ts";

/**
 * The kinds of the HTML attributes Labs expose most often. The generated
 * props documentation leaves out what a component inherits from its element,
 * so a bare control name of one of these takes its kind from here.
 */
const INHERITED_ATTRIBUTE_KINDS: Readonly<
  Partial<Record<string, PropDoc["kind"]>>
> = {
  disabled: "boolean",
  required: "boolean",
  readOnly: "boolean",
  "aria-current": "boolean",
  "aria-label": "string",
  placeholder: "string",
};

/** The configuration with every word picked for the locale in front of the visitor. */
interface LabModel {
  variants: LabVariantChoice[];
  controls: LabControlModel[];
}

/**
 * Resolves a Lab's configuration for one locale, and joins each control to the
 * generated documentation for the prop it drives. An attribute the component
 * inherits from its HTML element takes its kind from the control, or else from
 * `INHERITED_ATTRIBUTE_KINDS`.
 */
export function resolveLabModel<P>(
  config: LabConfig<P>,
  locale: SupportedLocale,
): LabModel {
  const docByName = new Map(config.doc.props.map((doc) => [doc.name, doc]));

  return {
    variants: config.variants.map((variant) => ({
      id: variant.id,
      label: variant.label[locale],
    })),
    controls: config.controls.map((control) => {
      const spec = typeof control === "object" ? control : { prop: control };
      const name = String(spec.prop);
      const doc = docByName.get(name);
      return {
        name,
        kind:
          ("kind" in spec ? spec.kind : undefined) ??
          doc?.kind ??
          INHERITED_ATTRIBUTE_KINDS[name] ??
          "other",
        members: doc?.members,
        defaultValue: doc?.defaultValue,
        samples:
          "samples" in spec
            ? spec.samples?.map((sample) => ({
                ...sample,
                label: sample.label[locale],
              }))
            : undefined,
        range: "range" in spec ? spec.range : undefined,
        replaces: "replaces" in spec ? spec.replaces?.map(String) : undefined,
      };
    }),
  };
}
