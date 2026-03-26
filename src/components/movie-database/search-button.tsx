"use client";

import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import { Button } from "../shared/button";
import { Overlay } from "../shared/overlay";

export function SearchButton() {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const locale = useLocale();

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
        aria-label={t({
          en: "Search movies and TV shows with AI",
          zh: "使用 AI 搜索电影和电视剧",
        })}
        hideLabelOnMobile
      >
        {t({ en: "AI Search", zh: "AI 搜索" })}
      </Button>
      <Overlay isOpen={isOverlayOpen} onClose={handleClose}>
        <div css={styles.container}>
          <h2 css={styles.title}>{t({ en: "AI Search", zh: "AI 搜索" })}</h2>
          <form onSubmit={handleSubmit} css={styles.form}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t({
                en: "Search with AI: 'best sci-fi movies from 2023' or 'funny Korean dramas'...",
                zh: "AI 搜索：'2023年最佳科幻电影'或'搞笑韩剧'...",
              })}
              aria-label={t({
                en: "AI search query",
                zh: "AI 搜索查询",
              })}
              css={styles.input}
              autoComplete="off"
              spellCheck={false}
            />
            <div css={styles.hint}>
              {t({
                en: "Press Enter to search or Escape to close",
                zh: "按回车搜索或按 Esc 关闭",
              })}
            </div>
          </form>
        </div>
      </Overlay>
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
    fontSize: font.vpHeading2,
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
    fontSize: font.uiHeading3,
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
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    padding: `${space._3} ${space._4}`,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: color.controlTrack,
    textAlign: "center",
    margin: 0,
  },
});
