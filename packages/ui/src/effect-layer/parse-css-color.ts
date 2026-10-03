/**
 * A colour as the GPU takes it: sRGB-encoded red, green and blue from 0 to 1,
 * and a straight (not premultiplied) alpha.
 *
 * @internal
 */
export type EffectColor = readonly [number, number, number, number];

type Matrix = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];
type Vector = readonly [number, number, number];

// The matrices and the white point come from the sample code of CSS Color 4.
const XYZ_D65_TO_LINEAR_SRGB: Matrix = [
  [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
  [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
  [0.05563007969699366, -0.20397695888897652, 1.0569715142428786],
];
const XYZ_D50_TO_D65: Matrix = [
  [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
  [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
  [0.012314014864481998, -0.020507649298898964, 1.330365926242124],
];
const LINEAR_P3_TO_XYZ_D65: Matrix = [
  [0.4865709486482162, 0.26566769316909306, 0.1982172852343625],
  [0.2289745640697488, 0.6917385218365064, 0.079286914093745],
  [0, 0.04511338185890264, 1.043944368900976],
];
const D50_WHITE: Vector = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

const mapVector = (
  [x, y, z]: Vector,
  transform: (value: number) => number,
): Vector => [transform(x), transform(y), transform(z)];

const multiply = (matrix: Matrix, [x, y, z]: Vector): Vector => [
  matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z,
  matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z,
  matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z,
];

/**
 * One sRGB-encoded channel, decoded to linear light.
 *
 * @internal
 */
export function toLinear(channel: number) {
  const magnitude = Math.abs(channel);
  return magnitude <= 0.04045
    ? channel / 12.92
    : Math.sign(channel) * ((magnitude + 0.055) / 1.055) ** 2.4;
}

/**
 * One linear-light channel, encoded as sRGB.
 *
 * @internal
 */
export function toGamma(channel: number) {
  const magnitude = Math.abs(channel);
  return magnitude > 0.0031308
    ? Math.sign(channel) * (1.055 * magnitude ** (1 / 2.4) - 0.055)
    : 12.92 * channel;
}

function labToXyzD50([lightness, a, b]: Vector): Vector {
  const kappa = 24389 / 27;
  const epsilon = 216 / 24389;
  const f1 = (lightness + 16) / 116;
  const f0 = a / 500 + f1;
  const f2 = f1 - b / 200;
  return [
    (f0 ** 3 > epsilon ? f0 ** 3 : (116 * f0 - 16) / kappa) * D50_WHITE[0],
    (lightness > kappa * epsilon ? f1 ** 3 : lightness / kappa) * D50_WHITE[1],
    (f2 ** 3 > epsilon ? f2 ** 3 : (116 * f2 - 16) / kappa) * D50_WHITE[2],
  ];
}

const xyzD50ToLinearSrgb = (xyz: Vector) =>
  multiply(XYZ_D65_TO_LINEAR_SRGB, multiply(XYZ_D50_TO_D65, xyz));

/**
 * An OKLab colour in linear sRGB, not clamped.
 *
 * @internal
 */
export function oklabToLinearSrgb([lightness, a, b]: Vector): Vector {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const polarToCartesian = ([lightness, chroma, hue]: Vector): Vector => [
  lightness,
  chroma * Math.cos((hue * Math.PI) / 180),
  chroma * Math.sin((hue * Math.PI) / 180),
];

/**
 * Reads one component: `none` is 0, and a percentage is a share of
 * `percentOf`.
 */
function readComponent(text: string, percentOf: number) {
  if (text === "none") {
    return 0;
  }
  const value = Number.parseFloat(text);
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }
  return text.endsWith("%") ? (value / 100) * percentOf : value;
}

/** Each colour space's three components, as linear sRGB. */
function toLinearSrgb(name: string, parts: readonly string[]): Vector | null {
  const read = (scales: Vector, from = 0): Vector => [
    readComponent(parts[from], scales[0]),
    readComponent(parts[from + 1], scales[1]),
    readComponent(parts[from + 2], scales[2]),
  ];
  switch (name) {
    case "rgb":
    case "rgba":
      return mapVector(read([255, 255, 255]), (channel) =>
        toLinear(channel / 255),
      );
    case "oklab":
      return oklabToLinearSrgb(read([1, 0.4, 0.4]));
    case "oklch":
      return oklabToLinearSrgb(polarToCartesian(read([1, 0.4, 1])));
    case "lab":
      return xyzD50ToLinearSrgb(labToXyzD50(read([100, 125, 125])));
    case "lch":
      return xyzD50ToLinearSrgb(
        labToXyzD50(polarToCartesian(read([100, 150, 1]))),
      );
    case "color": {
      const values = read([1, 1, 1], 1);
      switch (parts[0]) {
        case "srgb":
          return mapVector(values, toLinear);
        case "srgb-linear":
          return values;
        case "display-p3":
          return multiply(
            XYZ_D65_TO_LINEAR_SRGB,
            multiply(LINEAR_P3_TO_XYZ_D65, mapVector(values, toLinear)),
          );
        case "xyz":
        case "xyz-d65":
          return multiply(XYZ_D65_TO_LINEAR_SRGB, values);
        case "xyz-d50":
          return xyzD50ToLinearSrgb(values);
        default:
          return null;
      }
    }
    default:
      return null;
  }
}

/**
 * A colour channel clamped into 0 to 1.
 *
 * @internal
 */
export const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Converts a computed CSS colour, the way `getComputedStyle` writes it, to
 * the GPU's form. It reads `rgb()`, `rgba()`, `color()` in the sRGB,
 * linear sRGB, Display P3 and XYZ spaces, `lab()`, `lch()`, `oklab()`,
 * `oklch()` and `transparent`; a colour outside sRGB is clamped into it.
 * Returns `null` for anything else.
 *
 * @internal
 */
export function parseCssColor(value: string): EffectColor | null {
  const text = value.trim().toLowerCase();
  if (text === "transparent") {
    return [0, 0, 0, 0];
  }
  const match = /^([a-z-]+)\((.*)\)$/.exec(text);
  if (match === null) {
    return null;
  }
  const [, name, body] = match;
  const slash = body.indexOf("/");
  const channels = slash === -1 ? body : body.slice(0, slash);
  const parts = channels.split(/[\s,]+/).filter(Boolean);
  let alpha = slash === -1 ? "1" : body.slice(slash + 1).trim();
  if (slash === -1 && name.startsWith("rgb") && parts.length === 4) {
    alpha = parts.pop() ?? alpha;
  }
  if (parts.length !== (name === "color" ? 4 : 3)) {
    return null;
  }

  const linear = toLinearSrgb(name, parts);
  const opacity = readComponent(alpha, 1);
  if (linear === null || [...linear, opacity].some(Number.isNaN)) {
    return null;
  }
  const [red, green, blue] = mapVector(linear, (channel) =>
    clamp(toGamma(channel)),
  );
  return [red, green, blue, clamp(opacity)];
}
