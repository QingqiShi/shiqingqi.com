/** A model id for people: `claude-haiku-5-5` is "Claude Haiku 5.5". */
export function modelName(id: string): string {
  const parts = id.split("-");
  const firstNumber = parts.findIndex((part) => /^\d+$/.test(part));
  const words = (firstNumber === -1 ? parts : parts.slice(0, firstNumber)).map(
    (word) => word.charAt(0).toUpperCase() + word.slice(1),
  );
  const version =
    firstNumber === -1 ? [] : [parts.slice(firstNumber).join(".")];
  return [...words, ...version].join(" ");
}
