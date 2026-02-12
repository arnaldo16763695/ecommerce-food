"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { RiMoonFill, RiSunFill } from "@remixicon/react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button onClick={() => setTheme(isDark ? "light" : "dark")}>
      {isDark ? <RiMoonFill size={24} /> : <RiSunFill />}
    </button>
  );
}
