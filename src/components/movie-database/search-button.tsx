"use client";

import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { breakpoints } from "@/breakpoints.stylex";
import { useTranslations } from "@/hooks/use-translations";
import { color, font, space } from "@/tokens.stylex";
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
          <div css={styles.container}>
            <h2 css={styles.title}>{t("aiSearch")}</h2>
            <form onSubmit={handleSubmit} css={styles.form}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("aiSearchPlaceholder")}
                css={styles.input}
                autoComplete="off"
                spellCheck={false}
              />
              <div css={styles.hint}>{t("aiSearchHint")}</div>
            </form>
          </div>
        </Overlay>
      )}
    </>
  );
}

const styles = stylex.create({
  container: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    padding: space._4,
  },

  title: {
    fontSize: {
      default: font.size_3,
      [breakpoints.md]: font.size_4,
    },
    fontWeight: font.weight_6,
    color: color.textMain,
    margin: 0,
    marginBottom: space._4,
  },

  form: {
    width: "100%",
  },

  input: {
    width: "100%",
    fontSize: font.size_2,
    fontWeight: font.weight_4,
    lineHeight: 1.5,
    padding: `${space._3} ${space._3}`,
    borderWidth: 0,
    borderStyle: "none",
    outline: "none",
    color: color.textMain,
    "::placeholder": {
      color: color.textMuted,
    },
  },

  hint: {
    fontSize: font.size_0,
    color: color.textMuted,
    padding: `${space._3} ${space._4}`,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: color.controlTrack,
    textAlign: "center",
    margin: 0,
  },
});
