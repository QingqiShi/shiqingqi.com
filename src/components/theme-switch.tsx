"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "./button";
import { getDocumentClassName, globalStyles } from "../app/globalStyles";

export function ThemeSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = searchParams.get("theme");

  useEffect(() => {
    document.documentElement.className = getDocumentClassName(theme);
  }, [theme]);

  return (
    <Button
      onClick={() => {
        console.log("onClick");
        if (theme === "dark") {
          const params = new URLSearchParams(searchParams);
          params.set("theme", "light");
          router.replace(`${pathname}?${params.toString()}`);
        } else if (theme === "light") {
          const params = new URLSearchParams(searchParams);
          params.delete("theme");
          router.replace(`${pathname}?${params.toString()}`);
        } else {
          const params = new URLSearchParams(searchParams);
          params.set("theme", "dark");
          router.replace(`${pathname}?${params.toString()}`);
        }
      }}
    >
      Theme switcher
    </Button>
  );
}
