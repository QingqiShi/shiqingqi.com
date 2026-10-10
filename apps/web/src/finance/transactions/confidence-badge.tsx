"use client";

import { Badge } from "@tuja/ui/components/badge";
import { t } from "#src/i18n.ts";
import { REVIEW_CONFIDENCE } from "./review-confidence.ts";

/** How sure the AI was of a Transaction's suggested Category: high, medium or low. */
export function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= REVIEW_CONFIDENCE.high) {
    return (
      <Badge intent="success" size="sm">
        {t({ en: "High confidence", zh: "高置信度" })}
      </Badge>
    );
  }
  if (confidence >= REVIEW_CONFIDENCE.medium) {
    return (
      <Badge intent="warning" size="sm">
        {t({ en: "Medium confidence", zh: "中等置信度" })}
      </Badge>
    );
  }
  return (
    <Badge intent="danger" size="sm">
      {t({ en: "Low confidence", zh: "低置信度" })}
    </Badge>
  );
}
