// @inferEffectDependencies
"use client";

import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { usePathname, useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useRef, useState, useEffect, use, createContext } from "react";
import { breakpoints } from "@/breakpoints.stylex";
import { useTranslations } from "@/hooks/use-translations";
import { color, font, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getLocalePath } from "@/utils/pathname";
import { Button } from "../shared/button";
import { Dialog } from "../shared/dialog";
import type translations from "./filters.translations.json";

const SearchDialogContext = createContext<string | null>(null);

export function SearchDialogProvider({ children }: PropsWithChildren) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const locale: SupportedLocale = pathname.startsWith("/zh") ? "zh" : "en";
  const { t } = useTranslations<typeof translations>("filters");

  // Auto-focus input when dialog opens
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleOpen = () => {
      inputRef.current?.focus();
    };

    dialog.addEventListener("toggle", handleOpen);
    return () => dialog.removeEventListener("toggle", handleOpen);
  });

  const handleClose = () => {
    setQuery("");
    dialogRef.current?.close();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;

    const searchUrl = getLocalePath("/movie-database/ai-search", locale);
    router.push(`${searchUrl}?q=${encodeURIComponent(query.trim())}`);
    handleClose();
  };

  const dialogId = "ai-search-dialog";

  return (
    <SearchDialogContext value={dialogId}>
      {children}
      <Dialog
        ref={dialogRef}
        id={dialogId}
        onClose={handleClose}
        ariaLabel={t("aiSearch")}
      >
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
      </Dialog>
    </SearchDialogContext>
  );
}

export function SearchButton() {
  const dialogId = use(SearchDialogContext);
  const { t } = useTranslations<typeof translations>("filters");

  if (!dialogId) {
    throw new Error("SearchButton must be used within SearchDialogProvider");
  }

  return (
    <Button
      icon={<SparkleIcon weight="fill" role="presentation" />}
      commandfor={dialogId}
      command="show-modal"
      type="button"
      aria-label={t("aiSearchLabel")}
      hideLabelOnMobile
    >
      {t("aiSearch")}
    </Button>
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
