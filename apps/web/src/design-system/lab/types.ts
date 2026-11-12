import type { SupportedLocale } from "@tuja/i18n/types";
import type { PropDoc } from "@tuja/props-codegen/types";
import type { CodeToken } from "@tuja/ui/components/code-block";
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
  /** The binding is the whole module — `import * as stylex`. */
  isNamespace?: boolean;
}

/** A declaration of the Lab module that a source uses, such as its StyleX styles. */
export interface LabDefinition {
  name: string;
  tokens: readonly CodeToken[];
}

/**
 * The source of one value, which `labSource` takes from the Babel plugin. The
 * tokens can hold line breaks.
 */
export interface LabSourceCode {
  tokens: readonly CodeToken[];
  imports: readonly LabImport[];
  /** The snippet prints these before the element. */
  definitions?: readonly LabDefinition[];
}

/** One value a prop can take, offered as an option in its control. */
export interface LabSample {
  id: string;
  label: Record<SupportedLocale, string>;
  /**
   * The source the snippet prints for this value — `<PlusIcon weight="bold" />`.
   * Leave it out when `value` has a source from `labSource`.
   */
  code?: string;
  imports?: readonly LabImport[];
  value: unknown;
}

/** One curated configuration the Lab offers ready-made. */
export interface LabVariant<P> {
  id: string;
  label: Record<SupportedLocale, string>;
  props: LabVariantProps<P>;
}

/**
 * The props of a Variant. A prop with samples takes the id of one, whatever
 * the type of the value that the sample holds.
 */
type LabVariantProps<P> = { [K in keyof P]?: P[K] | string };

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
type LabControlSpec<P> =
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
      /**
       * The props that the component takes in place of this one, such as
       * CodeBlock's `source` for `parts`. A value for this prop leaves them out.
       */
      replaces?: readonly KeysOfUnion<P>[];
    };

/** The values a `number` control offers. */
interface LabNumberRange {
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
interface LabStateBinding<P> {
  /** The prop that takes the state — `value`. */
  prop: KeysOfUnion<P>;
  /** The handler the component calls with the next value — `onChange`. */
  handler: KeysOfUnion<P>;
  /** The type `useState` takes when TypeScript cannot infer it from the first value. */
  type?: { code: string; imports: readonly LabImport[] };
  /**
   * The value every call of the handler stands for, when the handler passes
   * none. Sheet's `onClose` stands for `false`, so the snippet prints
   * `onClose={() => setIsOpen(false)}`.
   */
  nextValue?: string | number | boolean;
  /**
   * The stand-in that content and `trigger` call to set the state, from
   * `labSetter`. The Canvas connects it to the Lab's state.
   */
  setter?: LabSetter;
  /**
   * A node from `labSource` that the Canvas draws before the Specimen, such as
   * the Button that opens a Sheet. The snippet prints it beside the element.
   */
  trigger?: ReactNode;
}

/** A function that sets the state of the Lab on the page. */
export interface LabSetter<T = never> {
  (next: T): void;
  /** Makes the stand-in call `set`, until the returned function runs. */
  connect: (set: (next: unknown) => void) => () => void;
}

/**
 * What the Lab reads from one generated props document. A configuration
 * imports the JSON directly, so the client loads the document of its own
 * component only.
 */
interface LabPropsDoc {
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
  /** The box the Specimen needs around it to show what it does. */
  scene?: LabSceneKind;
}

/**
 * A box around the Specimen that the snippet leaves out. `"scroll"`: a box
 * that scrolls, with rows after the Specimen. `"backdrop"`: a page of text for
 * the Specimen to float over. `"frame"`: a screen, wide or as narrow as a
 * phone, for a shell that scrolls its own columns. `"page"`: the same screen,
 * which scrolls, for a shell that the page scrolls.
 */
export type LabSceneKind = "scroll" | "backdrop" | "frame" | "page";

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
  /** The props that a value for this one leaves out. */
  replaces?: readonly string[];
}
