import type { SupportedLocale } from "#src/types.ts";
import type { LabConfig, LabControlModel, LabVariantChoice } from "./types.ts";

/** The configuration with every word picked for the locale in front of the visitor. */
export interface LabModel {
  variants: LabVariantChoice[];
  controls: LabControlModel[];
}

/**
 * Resolves a Lab's configuration for one locale, and joins each control to the
 * generated documentation for the prop it drives. A control may declare its own
 * kind instead, for an attribute the component inherits from its HTML element.
 */
export function resolveLabModel<P>(
  config: LabConfig<P>,
  locale: SupportedLocale,
): LabModel {
  const docByName = new Map(
    config.propsDoc.props.map((doc) => [doc.name, doc]),
  );

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
        kind: ("kind" in spec ? spec.kind : undefined) ?? doc?.kind ?? "other",
        members: doc?.members,
        defaultValue: doc?.defaultValue,
        samples:
          "samples" in spec
            ? spec.samples?.map((sample) => ({
                ...sample,
                label: sample.label[locale],
              }))
            : undefined,
      };
    }),
  };
}
