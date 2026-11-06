"use client";

import { BookOpenIcon } from "@phosphor-icons/react/dist/ssr/BookOpen";
import { ChartBarIcon } from "@phosphor-icons/react/dist/ssr/ChartBar";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { PaletteIcon } from "@phosphor-icons/react/dist/ssr/Palette";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import * as stylex from "@stylexjs/stylex";
import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { space } from "@tuja/ui/tokens.stylex";
import { type ComponentProps, type ReactNode, useState } from "react";
import navListDoc from "#src/_generated/props/nav-list.json";
import { defineLab } from "./define-lab.tsx";
import { FollowContext, FollowLink } from "./follow-link.tsx";
import { markCurrent } from "./mark-current.ts";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const CONTENT_SAMPLES: LabSample[] = [
  {
    id: "links",
    label: { en: "Links with icons", zh: "带图标的链接" },
    value: labSource(
      <>
        <NavLink href="#home" icon={<HouseIcon weight="bold" />} current>
          Home
        </NavLink>
        <NavLink href="#reports" icon={<ChartBarIcon weight="bold" />}>
          Reports
        </NavLink>
        <NavLink href="#settings" icon={<GearSixIcon weight="bold" />}>
          Settings
        </NavLink>
      </>,
    ),
  },
  {
    id: "plain",
    label: { en: "Links", zh: "链接" },
    value: labSource(
      <>
        <NavLink href="#profile" current>
          Profile
        </NavLink>
        <NavLink href="#security">Security</NavLink>
        <NavLink href="#billing">Billing</NavLink>
        <NavLink href="#notifications">Notifications</NavLink>
      </>,
    ),
  },
  {
    id: "groups",
    label: { en: "Groups", zh: "分组" },
    value: labSource(
      <>
        <NavGroup>
          <NavLink href="#overview" icon={<SquaresFourIcon weight="bold" />}>
            Overview
          </NavLink>
        </NavGroup>
        <NavGroup label="Guides">
          <NavGroup
            label="Basics"
            icon={<BookOpenIcon weight="bold" />}
            current
          >
            <NavLink href="#install" current>
              Install
            </NavLink>
            <NavLink href="#first-page">First page</NavLink>
          </NavGroup>
          <NavGroup label="Styling" icon={<PaletteIcon weight="bold" />}>
            <NavLink href="#tokens">Tokens</NavLink>
            <NavLink href="#themes">Themes</NavLink>
          </NavGroup>
        </NavGroup>
      </>,
    ),
  },
];

/**
 * A NavList sits in the consumer's own `<nav>`, which names the landmark, and
 * its rows fill the width it gets. The Lab gives both, and makes a followed
 * link current.
 */
function FollowedNavList({
  children,
  ...props
}: ComponentProps<typeof NavList>) {
  const [followed, setFollowed] = useState<{
    content: ReactNode;
    href: string;
  } | null>(null);
  // A new sample starts from the link it marks itself.
  const href =
    followed !== null && followed.content === children ? followed.href : null;
  return (
    <FollowContext
      value={(next) => {
        setFollowed({ content: children, href: next });
      }}
    >
      <nav aria-label="Docs" css={styles.frame}>
        <NavList {...props} linkComponent={FollowLink}>
          {markCurrent(children, href)}
        </NavList>
      </nav>
    </FollowContext>
  );
}

export const NavListLab = defineLab({
  doc: navListDoc,
  component: FollowedNavList,
  variants: [
    {
      id: "links",
      label: { en: "Links with icons", zh: "带图标的链接" },
      props: { children: "links" },
    },
    {
      id: "plain",
      label: { en: "Links", zh: "链接" },
      props: { children: "plain" },
    },
    {
      id: "groups",
      label: { en: "Groups", zh: "分组" },
      props: { children: "groups" },
    },
  ],
  controls: [{ prop: "children", samples: CONTENT_SAMPLES }],
});

const styles = stylex.create({
  frame: {
    inlineSize: space._13,
    maxInlineSize: "100%",
  },
});
