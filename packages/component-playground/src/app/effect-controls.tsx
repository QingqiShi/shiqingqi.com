import type { ChangeStore, TokenIndex } from "@tuja/component-playground";
import {
  BLUR_RADII,
  GLASS_OPACITY_STEPS,
  NONE,
  SCROLL_ORIENTATIONS,
  TEXTURE_MARKS,
  TOGGLE_DEFAULTS,
  TOGGLE_LABELS,
  TOGGLE_NAMES,
  WASH_DIRECTIONS,
  formatFloating,
  formatGlass,
  formatScrollMask,
  formatTexture,
  formatWash,
  layerEffects,
  type ToggleName,
} from "./model/layer-effects.ts";
import type { PickerSource } from "./model/picker-sources-for.ts";
import { Segmented, type SegmentedOption } from "./segmented.tsx";
import { TokenField } from "./value-chip.tsx";

/** Every option's value is its own display label. */
function stringOptions(values: readonly string[]): SegmentedOption<string>[] {
  return values.map((value) => ({ value, label: value }));
}

const BLUR_RADIUS_OPTIONS = stringOptions(
  BLUR_RADII.map((radius) => `${String(radius)}px`),
);
/** Glass alone can also sit over an opaque fill with nothing to blur. */
const GLASS_RADIUS_OPTIONS: SegmentedOption<string>[] = [
  { value: "off", label: "off" },
  ...BLUR_RADIUS_OPTIONS,
];
const GLASS_OPACITY_OPTIONS = stringOptions(
  GLASS_OPACITY_STEPS.map((step) => `${String(step)}%`),
);

/** The glass parts that take a colour token and an opacity step each. */
const GLASS_PARTS = [
  { part: "fill", opacity: "fillOpacity" },
  { part: "border", opacity: "borderOpacity" },
  { part: "highlight", opacity: "highlightOpacity" },
] as const;

interface EffectControlsProps {
  layer: string;
  store: ChangeStore;
  index: TokenIndex;
  isPhone: boolean;
  /** False where the selected element has nothing to scroll. */
  scrolls: boolean;
}

/**
 * The system toggles. Each one renders on the stand-in for real, so the
 * decision is made from the drawing rather than from its name.
 */
export function EffectControls({
  layer,
  store,
  index,
  isPhone,
  scrolls,
}: EffectControlsProps) {
  const effects = layerEffects(store, layer);
  const colourSource: PickerSource[] = [
    {
      id: "all",
      label: "All colours",
      tokens: index.catalogue.groups.color?.tokens ?? [],
    },
  ];
  const spaceSource: PickerSource[] = [
    {
      id: "space",
      label: "Space",
      tokens: index.catalogue.groups.space?.tokens ?? [],
    },
  ];

  const setToggle = (name: ToggleName, value: string) => {
    store.setToggle(layer, name, value);
  };

  const isOn = (name: ToggleName) => store.toggle(layer, name) !== NONE;

  const { texture, wash, floating, scrollMask, glass } = effects;

  return (
    <div className="pg-effects">
      {TOGGLE_NAMES.map((name) => (
        <div className="pg-effect" key={name}>
          <label className="pg-switch">
            <input
              type="checkbox"
              checked={isOn(name)}
              onChange={(event) => {
                setToggle(
                  name,
                  event.target.checked ? TOGGLE_DEFAULTS[name] : NONE,
                );
              }}
            />
            <span>{TOGGLE_LABELS[name]}</span>
          </label>

          {name === "texture" && texture ? (
            <div className="pg-effect-body">
              <div className="pg-field">
                <span className="pg-field-label">mark</span>
                <Segmented
                  label="mark"
                  options={stringOptions(TEXTURE_MARKS)}
                  value={texture.mark}
                  onPick={(mark) => {
                    setToggle("texture", formatTexture({ ...texture, mark }));
                  }}
                />
              </div>
              <div className="pg-field">
                <span className="pg-field-label">spacing</span>
                <TokenField
                  property="texture spacing"
                  title="Texture spacing"
                  value={texture.spacing}
                  index={index}
                  isPhone={isPhone}
                  sources={spaceSource}
                  onPick={(spacing) => {
                    setToggle(
                      "texture",
                      formatTexture({ ...texture, spacing }),
                    );
                  }}
                />
              </div>
              <div className="pg-field">
                <span className="pg-field-label">colour</span>
                <TokenField
                  property="texture colour"
                  title="Texture colour"
                  value={texture.color}
                  index={index}
                  isPhone={isPhone}
                  sources={colourSource}
                  onPick={(color) => {
                    setToggle("texture", formatTexture({ ...texture, color }));
                  }}
                />
              </div>
            </div>
          ) : null}

          {name === "wash" && wash ? (
            <div className="pg-effect-body">
              <div className="pg-field">
                <span className="pg-field-label">colour</span>
                <TokenField
                  property="wash colour"
                  title="Wash colour"
                  value={wash.color}
                  index={index}
                  isPhone={isPhone}
                  sources={colourSource}
                  onPick={(color) => {
                    setToggle("wash", formatWash({ ...wash, color }));
                  }}
                />
              </div>
              <div className="pg-field">
                <span className="pg-field-label">direction</span>
                <Segmented
                  label="direction"
                  options={stringOptions(WASH_DIRECTIONS)}
                  value={wash.direction}
                  onPick={(direction) => {
                    setToggle("wash", formatWash({ ...wash, direction }));
                  }}
                />
              </div>
            </div>
          ) : null}

          {name === "floating" && floating ? (
            <div className="pg-effect-body">
              <div className="pg-field">
                <span className="pg-field-label">radius</span>
                <Segmented
                  label="radius"
                  options={BLUR_RADIUS_OPTIONS}
                  value={`${String(floating.radius)}px`}
                  onPick={(picked) => {
                    setToggle(
                      "floating",
                      formatFloating({ radius: Number.parseInt(picked, 10) }),
                    );
                  }}
                />
              </div>
              <p className="pg-note">
                The cell draws sample text behind the stand-in, so the blur has
                a page to work on.
              </p>
            </div>
          ) : null}

          {name === "scrollMask" && scrollMask ? (
            <div className="pg-effect-body">
              <div className="pg-field">
                <span className="pg-field-label">axis</span>
                <Segmented
                  label="axis"
                  options={stringOptions(SCROLL_ORIENTATIONS)}
                  value={scrollMask.orientation}
                  onPick={(orientation) => {
                    setToggle(
                      "scrollMask",
                      formatScrollMask({ ...scrollMask, orientation }),
                    );
                  }}
                />
              </div>
              <div className="pg-field">
                <span className="pg-field-label">radius</span>
                <Segmented
                  label="radius"
                  options={BLUR_RADIUS_OPTIONS}
                  value={`${String(scrollMask.radius)}px`}
                  onPick={(picked) => {
                    setToggle(
                      "scrollMask",
                      formatScrollMask({
                        ...scrollMask,
                        radius: Number.parseInt(picked, 10),
                      }),
                    );
                  }}
                />
              </div>
              {scrolls ? null : (
                <p className="pg-note">
                  This layer has nothing to scroll yet. Set overflow to auto and
                  a size in Layout to see the mask.
                </p>
              )}
            </div>
          ) : null}

          {name === "glass" && glass ? (
            <div className="pg-effect-body">
              {GLASS_PARTS.map(({ part, opacity }) => (
                <div className="pg-field" key={part}>
                  <span className="pg-field-label">{part}</span>
                  <TokenField
                    property={`glass ${part}`}
                    title={`Glass ${part}`}
                    value={glass[part]}
                    index={index}
                    isPhone={isPhone}
                    sources={colourSource}
                    onPick={(picked) => {
                      setToggle(
                        "glass",
                        formatGlass({ ...glass, [part]: picked }),
                      );
                    }}
                  />
                  <Segmented
                    label={`${part} opacity`}
                    options={GLASS_OPACITY_OPTIONS}
                    value={`${String(glass[opacity])}%`}
                    onPick={(picked) => {
                      setToggle(
                        "glass",
                        formatGlass({
                          ...glass,
                          [opacity]: Number.parseInt(picked, 10),
                        }),
                      );
                    }}
                  />
                </div>
              ))}
              <div className="pg-field">
                <span className="pg-field-label">radius</span>
                <Segmented
                  label="radius"
                  options={GLASS_RADIUS_OPTIONS}
                  value={
                    glass.radius === "off" ? "off" : `${String(glass.radius)}px`
                  }
                  onPick={(picked) => {
                    setToggle(
                      "glass",
                      formatGlass({
                        ...glass,
                        radius:
                          picked === "off"
                            ? "off"
                            : Number.parseInt(picked, 10),
                      }),
                    );
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
