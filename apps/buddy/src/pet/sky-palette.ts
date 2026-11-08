export type SkyPalette = {
  top: string;
  bottom: string;
  ground: string;
  tuft: string;
  light: string;
  cloud: string;
  glow: string;
};

/** The scene's colours by the owner's time of day and the pet's mood: a worried pet lives under a red sky. */
export function skyPalette(isDay: boolean, isWorry: boolean): SkyPalette {
  if (isDay) {
    return isWorry
      ? {
          top: "#8E3B3B",
          bottom: "#E39A6B",
          ground: "#4A3A2A",
          tuft: "#6B4E36",
          light: "#FFB37A",
          cloud: "#F6C9B8",
          glow: "#FFF6C8",
        }
      : {
          top: "#5AAEE6",
          bottom: "#BFE4F7",
          ground: "#4E8B45",
          tuft: "#3D7336",
          light: "#FFE27A",
          cloud: "#FFFFFF",
          glow: "#FFF6C8",
        };
  }

  return isWorry
    ? {
        top: "#2A1220",
        bottom: "#4A1E2A",
        ground: "#3A1B22",
        tuft: "#6B2E3A",
        light: "#FFF1B8",
        cloud: "#FFFFFF",
        glow: "#FB7185",
      }
    : {
        top: "#0E1A33",
        bottom: "#24406A",
        ground: "#16301F",
        tuft: "#2F6B3F",
        light: "#FFF1B8",
        cloud: "#FFFFFF",
        glow: "#8FD17A",
      };
}
