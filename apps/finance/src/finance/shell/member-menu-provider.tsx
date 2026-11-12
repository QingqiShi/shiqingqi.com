"use client";

import { createContext, use, useState, type ReactNode } from "react";

interface MemberMenu {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const MemberMenuContext = createContext<MemberMenu | null>(null);

/**
 * Holds whether the signed-in Member's menu is open, above the screens. The
 * sidebar draws the Member under the list of each screen, and that copy
 * mounts again with its screen.
 */
export function MemberMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <MemberMenuContext value={{ isOpen, setIsOpen }}>
      {children}
    </MemberMenuContext>
  );
}

export function useMemberMenu() {
  const menu = use(MemberMenuContext);
  if (menu === null) {
    throw new Error("useMemberMenu needs a MemberMenuProvider above it.");
  }
  return menu;
}
