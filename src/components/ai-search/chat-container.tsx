"use client";

import { ArrowUp } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { breakpoints } from "@/breakpoints.stylex";
import { useTranslations } from "@/hooks/use-translations";
import { color, controlSize, font, space } from "@/tokens.stylex";
import type translations from "../../app/[locale]/movie-database/translations.json";

export interface ChatContainerProps {
  children: ReactNode;
  onClearConversation: () => void;
  hasMessages: boolean;
  emptyStateContent?: ReactNode;
}

export function ChatContainer({
  children,
  onClearConversation,
  hasMessages,
  emptyStateContent,
}: ChatContainerProps) {
  const { t } = useTranslations<typeof translations>("movie-database");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Check if user is near bottom (within 100px)
  const checkIfNearBottom = () => {
    if (!scrollContainerRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < 100;
  };

  // Handle scroll events to show/hide scroll-to-top button
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Debounce scroll event (50ms)
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const { scrollTop } = container;
        const isScrolledDown = scrollTop > 300;
        const nearBottom = checkIfNearBottom();

        setShowScrollToTop(isScrolledDown);
        setIsNearBottom(nearBottom);
      }, 50);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(scrollTimeout);
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Auto-scroll to newest message (only if user is near bottom)
  useEffect(() => {
    if (messagesEndRef.current && hasMessages && isNearBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [children, hasMessages, isNearBottom]);

  const handleScrollToTop = () => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div css={styles.container}>
      {/* Header with clear button */}
      <header css={styles.header}>
        <h1 css={styles.title}>AI Search</h1>
        {hasMessages && (
          <button
            onClick={onClearConversation}
            css={styles.clearButton}
            aria-label={t("clearConversation")}
            type="button"
          >
            <Trash size={20} weight="regular" />
            <span css={styles.clearButtonText}>{t("clearConversation")}</span>
          </button>
        )}
      </header>

      {/* Messages scroll container */}
      <div css={styles.messagesContainer} ref={scrollContainerRef}>
        {!hasMessages && emptyStateContent ? (
          <div css={styles.emptyState}>{emptyStateContent}</div>
        ) : (
          <div css={styles.messagesList}>
            {children}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Scroll to top button */}
      {showScrollToTop && (
        <button
          onClick={handleScrollToTop}
          css={styles.scrollToTopButton}
          aria-label="Scroll to top"
          type="button"
        >
          <ArrowUp size={24} weight="bold" />
        </button>
      )}
    </div>
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    flex: "1 1 auto",
    minHeight: 0,
    backgroundColor: color.backgroundMain,
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: space._3,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: color.controlTrack,
    backgroundColor: color.backgroundRaised,
    flexShrink: 0,
  },

  title: {
    fontSize: {
      default: font.size_3,
      [breakpoints.md]: font.size_4,
    },
    fontWeight: font.weight_6,
    color: color.textMain,
    margin: 0,
  },

  clearButton: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    padding: `${space._2} ${space._3}`,
    minHeight: controlSize._9,
    borderRadius: "8px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.controlTrack,
    backgroundColor: {
      default: color.backgroundRaised,
      ":hover": color.backgroundHover,
    },
    color: color.textMain,
    cursor: "pointer",
    fontSize: font.size_1,
    fontWeight: font.weight_5,
    transition: "background-color 0.2s ease",
  },

  clearButtonText: {
    display: {
      default: "none",
      [breakpoints.sm]: "inline",
    },
  },

  messagesContainer: {
    flex: "1 1 auto",
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
  },

  messagesList: {
    display: "flex",
    flexDirection: "column",
    padding: space._4,
    minHeight: "100%",
  },

  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    padding: space._4,
  },

  scrollToTopButton: {
    position: "absolute",
    bottom: space._5,
    right: space._5,
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: {
      default: color.controlActive,
      ":hover": color.controlActiveHover,
    },
    color: color.textOnActive,
    borderWidth: 0,
    borderStyle: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    transition: "background-color 0.2s ease",
    zIndex: 10,
  },
});
