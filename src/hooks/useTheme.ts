import { useState, useEffect, useCallback } from "react";
import { getSetting, setSetting } from "../lib/tauri-commands";
import type { ThemeId } from "../lib/types";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>("light");

  useEffect(() => {
    getSetting("theme").then((val) => {
      if (val) {
        const t = val as ThemeId;
        setThemeState(t);
        document.documentElement.setAttribute("data-theme", t);
      }
    });
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    setSetting("theme", t);
  }, []);

  return { theme, setTheme };
}
