/**
 * One documented prop of a `@tuja/ui` component, read from the component's own
 * TypeScript declaration. Inherited HTML attributes never appear here — the
 * element they come from is named by `PropsDoc.extendsHtml` instead.
 */
export interface PropDoc {
  /** Prop name, exactly as declared. */
  name: string;
  /** The declared type, printed as source text — `'"sm" | "md" | "lg"'`. */
  type: string;
  /** Which control documents this prop, and which control can drive it. */
  kind:
    "enum" | "boolean" | "number" | "string" | "node" | "function" | "other";
  /** The string-literal members, when `kind` is `"enum"`. */
  members?: string[];
  /** False when the prop is optional in any declaration that contributes it. */
  required: boolean;
  /** The default, printed as source text — `'"md"'`. */
  defaultValue?: string;
  /** JSDoc summary per locale. `zh` is empty until the component gets a `@zh` tag. */
  description: { en: string; zh: string };
  /** The `@deprecated` text, when the prop carries the tag. */
  deprecated?: string;
}

/** Every prop of one `@tuja/ui` component, keyed in `PROPS_DOCS` by its export subpath. */
export interface PropsDoc {
  /** The exported function name — `"Button"`. */
  component: string;
  /** Repo-relative path of the component source. */
  source: string;
  /** The HTML element whose attributes the props extend — `"button"`. */
  extendsHtml?: string;
  /** Declaration order, with `children` first and `css` last. */
  props: PropDoc[];
}
