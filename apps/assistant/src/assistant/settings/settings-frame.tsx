"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { AnchorButton } from "#src/links/anchor-button.tsx";
import {
  AssistantIsland,
  AssistantIslands,
} from "../shell/assistant-page-column.tsx";
import { SignOutButton } from "../shell/sign-out-button.tsx";
import { SettingsMenu } from "./settings-menu.tsx";
import {
  isSettingsSection,
  type SettingsSection,
} from "./settings-sections.ts";

/**
 * Settings: the section menu beside the open section at `lg` and wider, each
 * in its own island. Below `lg` the menu is its own page and each section
 * opens on its own with a way back.
 */
export function SettingsFrame({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const segment = useSelectedLayoutSegment();
  const current: SettingsSection | null = isSettingsSection(segment)
    ? segment
    : null;

  return (
    <AssistantIslands>
      <AssistantIsland
        css={[styles.menu, current !== null && styles.menuOnSection]}
      >
        <div css={stack.group}>
          <nav aria-label={t({ en: "Settings", zh: "设置" })} css={stack.group}>
            <Heading level={1} look="h3">
              {t({ en: "Settings", zh: "设置" })}
            </Heading>
            <SettingsMenu current={current} />
          </nav>
          <div>
            <SignOutButton />
          </div>
        </div>
      </AssistantIsland>
      {/* A new key opens each section at the top of its island. */}
      <AssistantIsland
        key={current ?? "report"}
        css={current === null && styles.sectionOnIndex}
      >
        <div css={[stack.item, styles.section]}>
          {current === null ? null : (
            <div css={styles.back}>
              <AnchorButton
                href={getLocalePath("/settings", locale)}
                look="ghost"
                size="sm"
                icon={<ArrowLeftIcon weight="bold" />}
              >
                {t({ en: "Settings", zh: "设置" })}
              </AnchorButton>
            </div>
          )}
          {children}
        </div>
      </AssistantIsland>
    </AssistantIslands>
  );
}

const styles = stylex.create({
  menu: {
    flexGrow: { default: 1, [breakpoints.lg]: 0 },
    flexShrink: { default: 1, [breakpoints.lg]: 0 },
    flexBasis: { default: 0, [breakpoints.lg]: "auto" },
    inlineSize: { default: null, [breakpoints.lg]: "16rem" },
  },
  menuOnSection: {
    display: { default: "none", [breakpoints.lg]: "flex" },
  },
  sectionOnIndex: {
    display: { default: "none", [breakpoints.lg]: "flex" },
  },
  section: {
    minInlineSize: 0,
    maxInlineSize: "48rem",
  },
  back: {
    display: { default: "block", [breakpoints.lg]: "none" },
  },
});
