"use client";

import { BookOpenIcon } from "@phosphor-icons/react/dist/ssr/BookOpen";
import { ChartBarIcon } from "@phosphor-icons/react/dist/ssr/ChartBar";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { PaletteIcon } from "@phosphor-icons/react/dist/ssr/Palette";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList, type NavListLinkProps } from "@tuja/ui/components/nav-list";
import { space } from "@tuja/ui/tokens.stylex";
import {
  createContext,
  use,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

const CurrentContext = createContext<
  [string, Dispatch<SetStateAction<string>>]
>(["", () => undefined]);

/**
 * The link Slot of the demos: it follows a link by making it current, so the
 * page stays where it is, the way a client-side router keeps it.
 */
function DemoLink({ onClick, ...props }: NavListLinkProps) {
  const [, setCurrent] = use(CurrentContext);
  return (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
        setCurrent(props.href);
      }}
    />
  );
}

function DemoLinkItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const [current] = use(CurrentContext);
  return (
    <NavLink href={href} current={current === href} icon={icon}>
      {children}
    </NavLink>
  );
}

/** A category that is current while one of `hrefs` is the current link. */
function DemoGroup({
  label,
  icon,
  hrefs,
  children,
}: {
  label: string;
  icon: ReactNode;
  hrefs: readonly string[];
  children: ReactNode;
}) {
  const [current] = use(CurrentContext);
  return (
    <NavGroup label={label} icon={icon} current={hrefs.includes(current)}>
      {children}
    </NavGroup>
  );
}

function DemoNav({
  label,
  initial,
  children,
}: {
  label: string;
  initial: string;
  children: ReactNode;
}) {
  const [current, setCurrent] = useState(initial);
  return (
    <CurrentContext value={[current, setCurrent]}>
      <nav aria-label={label} css={styles.frame}>
        <NavList linkComponent={DemoLink}>{children}</NavList>
      </nav>
    </CurrentContext>
  );
}

/** Three destinations, each with an icon. */
export function DestinationsNavList() {
  return (
    <DemoNav label={t({ en: "Demo app", zh: "示例应用" })} initial="#home">
      <DemoLinkItem href="#home" icon={<HouseIcon weight="bold" />}>
        {t({ en: "Home", zh: "首页" })}
      </DemoLinkItem>
      <DemoLinkItem href="#reports" icon={<ChartBarIcon weight="bold" />}>
        {t({ en: "Reports", zh: "报告" })}
      </DemoLinkItem>
      <DemoLinkItem href="#settings" icon={<GearSixIcon weight="bold" />}>
        {t({ en: "Settings", zh: "设置" })}
      </DemoLinkItem>
    </DemoNav>
  );
}

/**
 * An unlabelled lead link, then a section of two categories. The category
 * that holds the current link is open.
 */
export function GroupedNavList() {
  return (
    <DemoNav label={t({ en: "Demo docs", zh: "示例文档" })} initial="#install">
      <NavGroup>
        <DemoLinkItem href="#overview" icon={<SquaresFourIcon weight="bold" />}>
          {t({ en: "Overview", zh: "概览" })}
        </DemoLinkItem>
      </NavGroup>
      <NavGroup label={t({ en: "Guides", zh: "指南" })}>
        <DemoGroup
          label={t({ en: "Basics", zh: "入门" })}
          icon={<BookOpenIcon weight="bold" />}
          hrefs={["#install", "#first-page"]}
        >
          <DemoLinkItem href="#install">
            {t({ en: "Install", zh: "安装" })}
          </DemoLinkItem>
          <DemoLinkItem href="#first-page">
            {t({ en: "First page", zh: "第一个页面" })}
          </DemoLinkItem>
        </DemoGroup>
        <DemoGroup
          label={t({ en: "Styling", zh: "样式" })}
          icon={<PaletteIcon weight="bold" />}
          hrefs={["#tokens", "#themes"]}
        >
          <DemoLinkItem href="#tokens">
            {t({ en: "Tokens", zh: "令牌" })}
          </DemoLinkItem>
          <DemoLinkItem href="#themes">
            {t({ en: "Themes", zh: "主题" })}
          </DemoLinkItem>
        </DemoGroup>
      </NavGroup>
    </DemoNav>
  );
}

const styles = stylex.create({
  frame: {
    inlineSize: "100%",
    maxInlineSize: space._13,
  },
});
