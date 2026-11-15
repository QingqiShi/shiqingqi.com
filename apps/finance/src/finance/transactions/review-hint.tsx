"use client";

import { QuestionIcon } from "@phosphor-icons/react/dist/ssr/Question";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { parseAiDoubts } from "./parse-ai-doubts.ts";
import type { ReviewReason } from "./review-reason.ts";
import { useAiDoubtText } from "./use-ai-doubt-text.ts";
import { useReviewReasonText } from "./use-review-reason-text.ts";

/**
 * Why a row is in Review, in one short caption: what the AI was unsure of
 * and the answers it weighed, or the sentence of any other reason.
 */
export function ReviewHint({ reason }: { reason: ReviewReason }) {
  const reasonText = useReviewReasonText();
  const doubtText = useAiDoubtText();
  const doubts = reason.type === "ai" ? parseAiDoubts(reason.text) : null;
  const Icon = reason.type === "inTransit" ? QuestionIcon : SparkleIcon;

  return (
    <span css={styles.hint}>
      <Icon weight="fill" aria-hidden {...stylex.props(styles.icon)} />
      {doubts === null ? (
        <Text as="span" look="caption" tone="muted" lines={2}>
          {reasonText(reason)}
        </Text>
      ) : (
        <span css={styles.doubts}>
          {doubts.map((doubt) => (
            <Text
              as="span"
              look="caption"
              key={doubt.subject}
              css={styles.doubt}
            >
              <Text as="span" look="caption" tone="warning">
                {doubtText.subject(doubt)}
              </Text>{" "}
              <Text as="span" look="caption" tone="muted" numeric>
                {doubtText.options(doubt)}
              </Text>
            </Text>
          ))}
        </span>
      )}
    </span>
  );
}

const styles = stylex.create({
  hint: {
    display: "flex",
    alignItems: "baseline",
    gap: rhythm.inline,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "16rem",
    minInlineSize: 0,
  },
  icon: {
    flexShrink: 0,
    color: color.warningText,
    // Sits on the caption's first line rather than on the row's centre.
    translate: "0 0.125em",
  },
  doubts: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: rhythm.item,
    minInlineSize: 0,
  },
  doubt: {
    minInlineSize: 0,
  },
});
