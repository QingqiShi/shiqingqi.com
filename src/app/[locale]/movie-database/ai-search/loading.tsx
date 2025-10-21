import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center max-w-[400px]">
        <div className="mb-4 flex justify-center">
          <SparkleIcon
            size={48}
            weight="fill"
            className="text-control-active animate-pulse"
            role="presentation"
          />
        </div>
        <p className="text-xl font-semibold text-gray-12 dark:text-grayDark-12 mb-2 m-0">
          AI is thinking...
        </p>
        <p className="text-base text-gray-11 dark:text-grayDark-11 m-0">
          Searching movies and TV shows for you
        </p>
      </div>
    </div>
  );
}
