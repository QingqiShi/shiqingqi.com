import { gray } from "@tuja/ui/palette/gray.stylex";
import { ASSISTANT_LIGHT_CANVAS } from "#src/assistant/theme/assistant-theme.ts";

/** The literal colours of `color.background`, for the places that cannot read a token: the manifest, the browser chrome, and the global error page. */
export const CANVAS_COLORS = { light: ASSISTANT_LIGHT_CANVAS, dark: gray._0 };
