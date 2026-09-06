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
      presets: ["corner.radius_2"],
      base: {
        display: "inline-flex",
        alignItems: "stretch",
        gap: "space._00",
        borderWidth: "border.size_1",
        borderStyle: "solid",
        borderColor: "color.neutralBorder",
        backgroundColor: "color.bgSurfaceSunken",
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
    option: {
      presets: [
        "buttonReset.base",
        "a11y.focusRingInset",
        "transition.colors",
        "corner.radius_1",
      ],
      base: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "space._0",
        fontWeight: "font.weight_5",
        color: "color.textMuted",
        backgroundColor: "transparent",
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
        selected: {
          backgroundColor: "color.bgSurface",
          color: "color.textMain",
          fontWeight: "font.weight_6",
          boxShadow: "shadow._1",
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
