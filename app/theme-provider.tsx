"use client";

// App-level client providers (ported from the SYSDesigner "Research OS" shell).
//  - ThemeProvider: mirrors data-theme ("dark" | "light") onto <html>, persisted
//    in localStorage. A tiny inline script (themeScript) runs before first paint
//    so there is no flash of the wrong theme.
//  - ShellProvider: holds the workbench UI state shared by the sidebar drawer,
//    the toolbar, the scrim and the command palette.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";

export type Theme = "dark" | "light";

const THEME_KEY = "agentlab-theme";
const SIDEBAR_KEY = "agentlab-sidebar";

// Runs in <head> before paint: read the saved theme + sidebar state and set them
// on <html> so the first frame already matches (no flash of wrong theme, and no
// flash of an expanded rail when the user had it collapsed).
// Defaults: theme "dark", sidebar "expanded".
export const themeScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t="dark";}d.dataset.theme=t;}catch(e){d.dataset.theme="dark";}try{d.dataset.sidebar=localStorage.getItem("${SIDEBAR_KEY}")==="collapsed"?"collapsed":"expanded";}catch(e){d.dataset.sidebar="expanded";}})();`;

type ThemeCtx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeCtx>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, set] = useState<Theme>("dark");

  // Sync React state with whatever the no-flash script already applied.
  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") {
      set(saved);
      return;
    }
    const current = document.documentElement.dataset.theme;
    if (current === "light" || current === "dark") set(current);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    set(t);
    document.documentElement.dataset.theme = t;
    try {
      window.localStorage.setItem(THEME_KEY, t);
    } catch {
      /* ignore write failures (private mode, etc.) */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    set((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// ---------- Shell UI state (mobile sidebar drawer + desktop collapse + ⌘K) ----------

type ShellCtx = {
  // Mobile drawer: the rail slides in as an overlay (≤960px).
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  // Desktop collapse: the persistent rail is hidden to reclaim width (>960px).
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  cmdkOpen: boolean;
  setCmdkOpen: Dispatch<SetStateAction<boolean>>;
};

const ShellContext = createContext<ShellCtx>({
  sidebarOpen: false,
  setSidebarOpen: () => {},
  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => {},
  cmdkOpen: false,
  setCmdkOpen: () => {},
});

export function ShellProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Adopt whatever the no-flash script already wrote onto <html data-sidebar>.
  useEffect(() => {
    setSidebarCollapsed(document.documentElement.dataset.sidebar === "collapsed");
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      document.documentElement.dataset.sidebar = next ? "collapsed" : "expanded";
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "expanded");
      } catch {
        /* ignore write failures (private mode, etc.) */
      }
      return next;
    });
  }, []);

  return (
    <ShellContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        sidebarCollapsed,
        toggleSidebarCollapsed,
        cmdkOpen,
        setCmdkOpen,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export const useShell = () => useContext(ShellContext);
