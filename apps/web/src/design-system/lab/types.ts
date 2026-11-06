import type { SupportedLocale } from "@tuja/i18n/types";
import type { PropDoc } from "@tuja/props-codegen/types";
import type { ComponentType, ReactNode } from "react";

/**
 * The props a Lab holds for its Specimen. Loosely typed because a control only
 * learns a prop's kind at runtime, from the generated props documentation; the
 * configuration keeps the component's own types where an author writes them.
 */
export type LabProps = Record<string, unknown>;

/**
 * What the Lab reads from one generated prop document. Looser than `PropDoc`,
 * because a configuration imports the generated JSON directly and JSON carries
 * no string-literal types.
 */
export interface LabPropDoc {
  name: string;
  kind: string;
  members?: readonly (string | number)[];
  defaultValue?: string;
}

/** A binding a snippet has to import for one sample to compile. */
export interface LabImport {
  /** The imported binding — `PlusIcon`. */
  name: string;
  /** The module it comes from, exactly as the repo imports it. */
  from: string;
  /** The binding is a type, so the import marks it `type`. */
  isType?: boolean;
}

/** One node a `node` prop can take, offered as an option in its control. */
export interface LabSample {
  id: string;
  label: Record<SupportedLocale, string>;
  /** The source the snippet prints for this node — `<PlusIcon weight="bold" />`. */
  code: string;
  imports: readonly LabImport[];
  value: ReactNode;
}

/** One curated configuration the Lab offers ready-made. */
export interface LabVariant<P> {
  id: string;
  label: Record<SupportedLocale, string>;
  props: Partial<P>;
}

/**
 * Every key of every branch of a union. `T extends T` makes the conditional
 * distributive, which is what splits the union; `keyof T` on its own keeps
 * only the keys all branches share.
 */
type KeysOfUnion<T> = T extends T ? keyof T : never;

/**
 * One prop the Lab exposes. A bare name takes everything from the generated
 * props documentation; the object form adds what the documentation cannot
 * carry.
 */
export type LabControlSpec<P> =
  | KeysOfUnion<P>
  | {
      prop: KeysOfUnion<P>;
      /** The nodes a `node` prop can take. Without them the prop takes text. */
      samples?: readonly LabSample[];
      /**
       * Sets the kind of the control. Use it for an inherited HTML attribute
       * that the generated props documentation does not carry and the Lab
       * does not know, or for a documented prop whose kind is `"other"`.
       */
      kind?: PropDoc["kind"];
      /** The range of a `number` control. Without it the control runs 0–100 in steps of 1. */
      range?: LabNumberRange;
    };

/** The values a `number` control offers. */
export interface LabNumberRange {
  min: number;
  max: number;
  step?: number;
}

/**
 * A prop pair the component's owner holds in state, such as `value` and
 * `onChange`. The Lab holds the value: the handler on the Specimen sets it, so
 * the Specimen stays operable and the panel follows. The snippet prints the
 * `useState` line and the pair a reader would write.
 */
export interface LabStateBinding<P> {
  /** The prop that takes the state — `value`. */
  prop: KeysOfUnion<P>;
  /** The handler the component calls with the next value — `onChange`. */
  handler: KeysOfUnion<P>;
  /** The type `useState` takes when TypeScript cannot infer it from the first value. */
  type?: { code: string; imports: readonly LabImport[] };
}

/**
 * What the Lab reads from one generated props document. A configuration
 * imports the JSON directly, so the client loads the document of its own
 * component only.
 */
export interface LabPropsDoc {
  /** The export subpath of the component — `"button"`. */
  name: string;
  /** The element name the snippet prints — `"Button"`. */
  component: string;
  props: readonly LabPropDoc[];
}

/**
 * Everything one component's Lab needs to draw itself. The Specimen is
 * `component` with the Lab's props on it. A Specimen that needs more, such as
 * its own state or a wrapper, takes a local component that adds it.
 */
export interface LabConfig<P> {
  doc: LabPropsDoc;
  component: ComponentType<P>;
  variants: NoInfer<readonly LabVariant<P>[]>;
  controls: NoInfer<readonly LabControlSpec<P>[]>;
  state?: NoInfer<LabStateBinding<P>>;
}

/** One sample with its label resolved for the locale in front of the visitor. */
export interface LabSampleChoice extends Omit<LabSample, "label"> {
  label: string;
}

/** One Variant's identity, with its label resolved for the locale. */
export interface LabVariantChoice {
  id: string;
  label: string;
}

/**
 * One prop control, resolved: what the panel and the mobile bar both render
 * from, and what the snippet reads a prop's default from.
 */
export interface LabControlModel {
  /** The prop name. It labels the control and names it to assistive tech. */
  name: string;
  kind: string;
  /** The values an `enum` prop takes. */
  members?: readonly (string | number)[];
  /** The prop's default, printed as source text — `'"md"'`. */
  defaultValue?: string;
  samples?: readonly LabSampleChoice[];
  range?: LabNumberRange;
}
