"use client";

import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { useTranslations } from "@/hooks/use-translations";
import type { SupportedLocale } from "@/types";
import { getLocalePath } from "@/utils/pathname";
import { Button } from "../shared/button";
import { Overlay } from "../shared/overlay";
import type translations from "./filters.translations.json";

export function SearchButton() {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const locale: SupportedLocale = pathname.startsWith("/zh") ? "zh" : "en";
  const { t } = useTranslations<typeof translations>("filters");

  // Auto-focus when opened
  useEffect(() => {
    if (isOverlayOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOverlayOpen]);

  const handleClose = () => {
    setIsOverlayOpen(false);
    // Reset state when closing
    setTimeout(() => {
      setQuery("");
    }, 150); // Small delay to avoid visual glitches during closing animation
  };

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOverlayOpen) {
        setIsOverlayOpen(false);
        setTimeout(() => {
          setQuery("");
        }, 150);
      }
    };

    if (isOverlayOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOverlayOpen]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;

    // Navigate to AI search results page
    const searchUrl = getLocalePath("/movie-database/ai-search", locale);
    router.push(`${searchUrl}?q=${encodeURIComponent(query.trim())}`);
    handleClose();
    setQuery("");
  };

  return (
    <>
      <Button
        icon={<SparkleIcon weight="fill" role="presentation" />}
        onClick={() => setIsOverlayOpen(true)}
        type="button"
        aria-label={t("aiSearchLabel")}
        hideLabelOnMobile
      >
        {t("aiSearch")}
      </Button>
      <Overlay isOpen={isOverlayOpen} onClose={handleClose}>
        <div className="h-full flex flex-col overflow-hidden p-4">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-12 dark:text-grayDark-12 m-0 mb-4">
            {t("aiSearch")}
          </h2>
          <form onSubmit={handleSubmit} className="w-full">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("aiSearchPlaceholder")}
              className="w-full text-lg font-normal leading-6 p-3 border-0 outline-none text-gray-12 dark:text-grayDark-12 placeholder:text-gray-11 dark:placeholder:text-grayDark-11"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="text-base text-gray-11 dark:text-grayDark-11 p-3 px-4 border-t border-gray-6 dark:border-grayDark-6 text-center m-0">
              {t("aiSearchHint")}
            </div>
          </form>
        </div>
      </Overlay>
    </>
  );
}
