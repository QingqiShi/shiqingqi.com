import { cn } from "@/lib/utils";

export function BackgroundLines() {
  const lineBaseClasses =
    "hidden absolute top-0 bottom-0 w-px bg-[linear-gradient(theme(colors.gray.11)_33%,transparent_0%)] dark:bg-[linear-gradient(theme(colors.grayDark.11)_33%,transparent_0%)] bg-right bg-[length:1px_8px] bg-repeat-y";

  return (
    <div
      className="absolute top-0 right-0 bottom-0 left-0 z-base pointer-events-none opacity-24"
      role="presentation"
    >
      <div
        className={cn(lineBaseClasses, "block left-0")}
        role="presentation"
      />
      <div
        className={cn(
          lineBaseClasses,
          "sm:block sm:left-1/2 md:left-1/3 lg:left-1/4",
        )}
        role="presentation"
      />
      <div
        className={cn(lineBaseClasses, "md:block md:left-2/3 lg:left-1/2")}
        role="presentation"
      />
      <div
        className={cn(lineBaseClasses, "lg:block lg:left-3/4")}
        role="presentation"
      />
      <div
        className={cn(lineBaseClasses, "block left-full")}
        role="presentation"
      />
    </div>
  );
}
