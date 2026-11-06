import { getToolName, isTextUIPart, isToolUIPart, type UIMessage } from "ai";

type Part = UIMessage["parts"][number];

function isSourcePart(part: Part) {
  return part.type === "source-url" || part.type === "source-document";
}

function isCompactionPart(part: Part) {
  return (
    isTextUIPart(part) && part.providerMetadata?.anthropic.type === "compaction"
  );
}

// Web search with dynamic filtering runs code on Anthropic's servers. The AI
// SDK streams each run as a `code_execution` dynamic tool part.
function isWebSearchCodeExecution(part: Part) {
  return (
    isToolUIPart(part) &&
    part.providerExecuted === true &&
    getToolName(part) === "code_execution"
  );
}

/**
 * Shapes an assistant message's parts for display. A cited span arrives as a
 * text part of its own, so text parts with only sources between them become
 * one part, and the sentence stays in one paragraph. Tool parts that are
 * internal steps of web search are dropped.
 */
export function toDisplayParts(parts: UIMessage["parts"]): UIMessage["parts"] {
  const result: Part[] = [];
  let openTextIndex = -1;
  const sourcesAfterOpenText: Part[] = [];

  const closeOpenText = () => {
    result.push(...sourcesAfterOpenText);
    sourcesAfterOpenText.length = 0;
    openTextIndex = -1;
  };

  for (const part of parts) {
    if (isWebSearchCodeExecution(part)) {
      closeOpenText();
      continue;
    }
    if (isTextUIPart(part) && !isCompactionPart(part)) {
      const open = openTextIndex === -1 ? undefined : result[openTextIndex];
      if (open !== undefined && isTextUIPart(open)) {
        const citations = [
          ...(open.citations ?? []),
          ...(part.citations ?? []),
        ];
        result[openTextIndex] = {
          ...open,
          text: open.text + part.text,
          state: part.state,
          ...(citations.length > 0 ? { citations } : {}),
        };
        continue;
      }
      closeOpenText();
      openTextIndex = result.length;
      result.push(part);
      continue;
    }
    if (openTextIndex !== -1 && isSourcePart(part)) {
      sourcesAfterOpenText.push(part);
      continue;
    }
    closeOpenText();
    result.push(part);
  }
  closeOpenText();
  return result;
}
