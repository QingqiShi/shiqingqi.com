import { playground } from "@tuja/component-playground";
import type { ReactNode } from "react";

const GRID_ICON =
  "M200,36H56A20,20,0,0,0,36,56V200a20,20,0,0,0,20,20H200a20,20,0,0,0,20-20V56A20,20,0,0,0,200,36Zm-4,80H140V60h56ZM116,60v56H60V60ZM60,140h56v56H60Zm80,56V140h56v56Z";
const LIST_ICON =
  "M228,128a12,12,0,0,1-12,12H40a12,12,0,0,1,0-24H216A12,12,0,0,1,228,128ZM40,76H216a12,12,0,0,0,0-24H40a12,12,0,0,0,0,24ZM216,180H40a12,12,0,0,0,0,24H216a12,12,0,0,0,0-24Z";
const ROWS_ICON =
  "M208,136H48a20,20,0,0,0-20,20v36a20,20,0,0,0,20,20H208a20,20,0,0,0,20-20V156A20,20,0,0,0,208,136Zm-4,52H52V160H204Zm4-144H48A20,20,0,0,0,28,64v36a20,20,0,0,0,20,20H208a20,20,0,0,0,20-20V64A20,20,0,0,0,208,44Zm-4,52H52V68H204Z";

function Glyph({ path }: { path: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      viewBox="0 0 256 256"
    >
      <path d={path} />
    </svg>
  );
}

interface Option {
  label: string;
  icon?: ReactNode;
}

const TEXT_OPTIONS: Option[] = [{ label: "Grid" }, { label: "List" }];

const ICON_OPTIONS: Option[] = [
  { label: "Grid", icon: <Glyph path={GRID_ICON} /> },
  { label: "List", icon: <Glyph path={LIST_ICON} /> },
  { label: "Compact", icon: <Glyph path={ROWS_ICON} /> },
];

interface ControlProps {
  size: "sm" | "md";
  options: Option[];
  selected: number;
  hover?: number;
  focus?: number;
  fullWidth?: boolean;
  hideLabels?: boolean;
}

function Control({
  size,
  options,
  selected,
  hover,
  focus,
  fullWidth,
  hideLabels,
}: ControlProps) {
  const trackVariants = [size, fullWidth && "fullWidth"]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      data-layer="track"
      data-variant={trackVariants}
      role="radiogroup"
      aria-label="View"
    >
      <span data-layer="indicator" aria-hidden>
        <span data-layer="before" />
      </span>
      {options.map((option, index) => (
        <button
          key={option.label}
          type="button"
          role="radio"
          aria-checked={index === selected}
          data-layer="option"
          data-variant={trackVariants}
          data-state={[
            index === hover && "hover",
            index === selected && "selected",
            index === focus && "focus",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {option.icon ? (
            <span data-layer="icon" aria-hidden>
              {option.icon}
            </span>
          ) : null}
          <span
            data-layer="label"
            data-variant={hideLabels ? "hideLabels" : ""}
          >
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export default playground({
  component: "SegmentedControl",
  source: "packages/ui/src/components/forms/segmented-control.tsx",
  layers: {
    track: {
      presets: ["corner.squircle_round"],
      base: {
        display: "inline-flex",
        alignItems: "stretch",
        gap: "space._00",
        borderWidth: "border.size_1",
        borderStyle: "solid",
        borderColor: "color.neutralBorder",
        backgroundColor: "color.bgCanvasSubtle",
        // Makes the track the indicator's containing block; `isolate` keeps
        // the indicator's negative z-index inside the track's stacking
        // context.
        position: "relative",
        isolation: "isolate",
      },
      variants: {
        sm: {
          padding:
            "calc(({controlSize._8} - {controlSize._7}) / 2 - {border.size_1})",
        },
        md: {
          padding:
            "calc(({controlSize._9} - {controlSize._8}) / 2 - {border.size_1})",
        },
        fullWidth: { display: "flex", inlineSize: "100%" },
      },
    },
    // Follows the selected option via CSS anchor positioning, so nothing
    // measures a segment in JS. Paints the Glass surface the option gives up
    // once it is selected.
    indicator: {
      presets: ["corner.squircle_round"],
      base: {
        position: "absolute",
        positionAnchor: "--segmented-control-selected",
        top: "anchor(top)",
        right: "anchor(right)",
        bottom: "anchor(bottom)",
        left: "anchor(left)",
        zIndex: -1,
        pointerEvents: "none",
        transition:
          "top {duration._300} {easing.spring}, right {duration._300} {easing.spring}, bottom {duration._300} {easing.spring}, left {duration._300} {easing.spring}",
        backgroundColor: "color.glassFill",
        // Cancels the blur `glassSurface.base` carries: the indicator sits
        // over the track's opaque fill, so the blur has nothing to sample.
        backdropFilter: "none",
        boxShadow:
          "{shadow._2}, inset 0 -1px 1px color-mix(in srgb, {color.glassHighlight} 64%, transparent)",
      },
    },
    // The indicator's rim. Stands in for `glassSurface.base`'s `::before`:
    // the border colour all the way round, masked to a hairline, lit on top
    // and along the bottom with the light gone down the sides. It inherits
    // the indicator's radius and corner shape, so it needs its own.
    before: {
      base: {
        position: "absolute",
        inset: "0",
        borderRadius: "inherit",
        cornerShape: "inherit",
        padding: "calc({border.size_1} / 2)",
        pointerEvents: "none",
        backgroundImage:
          "linear-gradient(180deg, {color.glassHighlight} 0%, transparent 35%, transparent 65%, color-mix(in srgb, {color.glassHighlight} 60%, transparent) 100%), linear-gradient({color.glassBorder}, {color.glassBorder})",
        maskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
        maskClip: "content-box, border-box",
        maskComposite: "exclude",
      },
    },
    option: {
      presets: [
        "buttonReset.base",
        "a11y.focusRingInset",
        "transition.colors",
        "corner.squircle_round",
      ],
      base: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "space._0",
        fontWeight: "font.weight_5",
        color: "color.textMuted",
        backgroundColor: "transparent",
        // Every option carries the border, not only the selected one, so the
        // box keeps its size and no border colour fades in on select.
        borderWidth: "border.size_1",
        borderStyle: "solid",
        borderColor: "transparent",
      },
      variants: {
        sm: {
          minBlockSize: "controlSize._7",
          paddingInline: "controlSize._2",
          fontSize: "font.uiCaption",
        },
        md: {
          minBlockSize: "controlSize._8",
          paddingInline: "controlSize._3",
          fontSize: "font.uiBodySmall",
        },
        fullWidth: { flexGrow: "1", flexBasis: "0", minInlineSize: "0" },
      },
      states: {
        hover: {
          backgroundColor: "color.bgInteractiveHover",
          color: "color.textMain",
        },
        // The indicator paints the fill, the edge, and the shadow now. The
        // option only names the anchor for the indicator to follow.
        selected: {
          anchorName: "--segmented-control-selected",
          backgroundColor: "transparent",
          color: "color.textMain",
          fontWeight: "font.weight_6",
          borderColor: "transparent",
        },
      },
    },
    icon: {
      opaque: true,
      base: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: "0",
        inlineSize: "1em",
        blockSize: "1em",
      },
    },
    label: {
      presets: ["truncate.base"],
      base: { minInlineSize: "0" },
      variants: {
        // `hideLabels` swaps the label's styles for `a11y.srOnly`. The layer
        // keeps `truncate.base`, so the variant puts back the one declaration
        // that primitive makes and `a11y.srOnly` does not.
        hideLabels: {
          position: "absolute",
          inlineSize: "1px",
          blockSize: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
          borderWidth: "0",
          textOverflow: "clip",
        },
      },
    },
  },
  cells: [
    {
      title: "sm",
      tree: <Control size="sm" options={TEXT_OPTIONS} selected={0} />,
    },
    {
      title: "md",
      tree: <Control size="md" options={TEXT_OPTIONS} selected={0} />,
    },
    {
      title: "With icons",
      tree: <Control size="md" options={ICON_OPTIONS} selected={0} />,
    },
    {
      title: "Hover",
      tree: <Control size="md" options={TEXT_OPTIONS} selected={0} hover={1} />,
    },
    {
      title: "Focus",
      tree: <Control size="md" options={TEXT_OPTIONS} selected={0} focus={0} />,
    },
    {
      title: "Icon-only",
      tree: (
        <Control size="md" options={ICON_OPTIONS} selected={0} hideLabels />
      ),
    },
    {
      title: "Full width",
      tree: (
        <div style={{ inlineSize: "320px" }}>
          <Control size="md" options={ICON_OPTIONS} selected={0} fullWidth />
        </div>
      ),
    },
  ],
});
