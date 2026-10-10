/** The AI confidence at or above which a suggestion counts as high, then medium; below medium it is low. */
export const REVIEW_CONFIDENCE: Readonly<{ high: number; medium: number }> = {
  high: 0.9,
  medium: 0.7,
};
