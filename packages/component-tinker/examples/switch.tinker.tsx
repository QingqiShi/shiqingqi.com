import { tinker } from "@tuja/component-tinker";

interface ControlProps {
  size: "sm" | "md" | "lg";
  value?: "on" | "indeterminate";
  hover?: boolean;
  focus?: boolean;
  disabled?: boolean;
}

// The component renders an `<input>`, which holds no child, so the stand-in is
// a `div` with the same role and the thumb is a real element.
function Control({ size, value, hover, focus, disabled }: ControlProps) {
  return (
    <div
      data-layer="switch"
      data-variant={size}
      data-state={[
        value === "on" && "checked",
        focus && "focus",
        disabled && "disabled",
      ]
        .filter(Boolean)
        .join(" ")}
      role="switch"
      aria-checked={value === "on"}
      aria-label="Autoplay trailers"
    >
      <div
        data-layer="before"
        data-variant={size}
        data-state={[
          value === "on" && "checked",
          value === "indeterminate" && "indeterminate",
          hover && "hover",
        ]
          .filter(Boolean)
          .join(" ")}
      />
    </div>
  );
}

export default tinker({
  component: "Switch",
  source: "packages/ui/src/components/forms/switch.tsx",
  layers: {
    switch: {
      presets: ["buttonReset.base", "a11y.focusRing", "corner.radius_round"],
      base: {
        fontSize: "font.uiControl",
        margin: "0",
        aspectRatio: "ratio.double",
        cursor: "pointer",
        opacity: "1",
        display: "flex",
        padding: "border.size_2",
        position: "relative",
        transition: "background-color {duration._200} {easing.ease}",
        backgroundColor: "color.surfaceNeutralSubtle",
        boxShadow: "shadow._2",
        touchAction: "none",
      },
      // Each size sets `switchTokens.trackHeight`, and the track height is the
      // switch's whole scale: the thumb and its travel derive from it.
      variants: {
        sm: { height: "controlSize._8" },
        md: { height: "controlSize._9" },
        lg: { height: "controlSize._10" },
      },
      states: {
        checked: { backgroundColor: "color.accent" },
        disabled: { cursor: "not-allowed", opacity: "opacity.disabled" },
      },
    },
    before: {
      base: {
        backgroundColor: "color.bgSurfaceBright",
        borderRadius: "border.radius_round",
        boxShadow: "none",
        display: "block",
        aspectRatio: "ratio.square",
        transform: "translateX(0)",
        transition:
          "transform {duration._200} {easing.ease}, box-shadow {duration._400} {easing.ease}",
        zIndex: "layer.content",
      },
      variants: {
        sm: { width: "calc({controlSize._8} - {border.size_2} * 2)" },
        md: { width: "calc({controlSize._9} - {border.size_2} * 2)" },
        lg: { width: "calc({controlSize._10} - {border.size_2} * 2)" },
      },
      states: {
        hover: { boxShadow: "shadow._3" },
        "checked sm": { transform: "translateX({controlSize._8})" },
        "checked md": { transform: "translateX({controlSize._9})" },
        "checked lg": { transform: "translateX({controlSize._10})" },
        "indeterminate sm": {
          transform: "translateX(calc({controlSize._8} / 2))",
        },
        "indeterminate md": {
          transform: "translateX(calc({controlSize._9} / 2))",
        },
        "indeterminate lg": {
          transform: "translateX(calc({controlSize._10} / 2))",
        },
      },
    },
  },
  cells: [
    { title: "sm", tree: <Control size="sm" value="on" /> },
    { title: "md", tree: <Control size="md" value="on" /> },
    { title: "lg", tree: <Control size="lg" value="on" /> },
    { title: "Off", tree: <Control size="md" /> },
    {
      title: "Indeterminate",
      tree: <Control size="md" value="indeterminate" />,
    },
    { title: "Hover", tree: <Control size="md" hover /> },
    { title: "Focus", tree: <Control size="md" focus /> },
    { title: "Disabled", tree: <Control size="md" disabled /> },
  ],
});
