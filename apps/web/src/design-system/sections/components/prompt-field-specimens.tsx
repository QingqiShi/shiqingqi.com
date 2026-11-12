"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { PromptField } from "@tuja/ui/components/prompt-field";
import { useState } from "react";
import { Specimen } from "#src/design-system/specimen.tsx";

function AskField({
  multiline,
  size,
}: {
  multiline?: boolean;
  size?: "md" | "lg";
}) {
  const [prompt, setPrompt] = useState("");
  return (
    <PromptField
      label={t({ en: "Ask a question", zh: "提问" })}
      placeholder={t({ en: "Ask a question...", zh: "提问..." })}
      value={prompt}
      onValueChange={setPrompt}
      onSubmit={() => {
        setPrompt("");
      }}
      size={size}
      multiline={multiline}
      leading={<SparkleIcon weight="fill" />}
      action={
        <Button
          type="submit"
          size="sm"
          aria-label={t({ en: "Send", zh: "发送" })}
          disabled={!prompt.trim()}
          icon={<ArrowUpIcon weight="bold" />}
        />
      }
    />
  );
}

export function PromptFieldRowExample() {
  return (
    <Specimen caption={t({ en: "one line", zh: "单行" })}>
      <AskField />
    </Specimen>
  );
}

export function PromptFieldGrowExample() {
  return (
    <Specimen caption='multiline, size="lg"'>
      <AskField multiline size="lg" />
    </Specimen>
  );
}
