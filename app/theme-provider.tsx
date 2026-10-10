"use client";

// App-level client providers (ported from the SYSDesigner "Research OS" shell).
//  - ThemeProvider: mirrors data-theme ("dark" | "light") onto <html>, persisted
//    in localStorage. A tiny inline script (themeScript) at the top of <body>
//    runs before first paint so there is no flash of the wrong theme.
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

// Runs at the top of <body> before paint: read the saved theme + sidebar state and set them
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

  // Sync React state with the saved theme, and write it back onto <html>.
  // The write is not redundant: if React ever re-renders the document on the
  // client (a failed hydration does exactly that), the attribute the no-flash
  // script set is gone, and the page falls back to the dark tokens while this
  // state still says light. Storage can also refuse to be read at all (site
  // data blocked), which must not take the page down with it.
  useEffect(() => {
    const d = document.documentElement;
    let next: Theme = d.dataset.theme === "light" ? "light" : "dark";
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") next = saved;
    } catch {
      /* keep what the script applied */
    }
    set(next);
    d.dataset.theme = next;
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

  // The side effects stay out of the state updater: React may call an updater
  // twice (it does in StrictMode), and the DOM and storage writes belong to the
  // click, not to the computation of the next value.
  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

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

  // Adopt the saved rail state and write it back onto <html data-sidebar>, for
  // the same reason as the theme above: a client re-render clears the attribute.
  useEffect(() => {
    const d = document.documentElement;
    let collapsed = d.dataset.sidebar === "collapsed";
    try {
      const saved = window.localStorage.getItem(SIDEBAR_KEY);
      if (saved === "collapsed" || saved === "expanded") collapsed = saved === "collapsed";
    } catch {
      /* keep what the script applied */
    }
    setSidebarCollapsed(collapsed);
    d.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    document.documentElement.dataset.sidebar = next ? "collapsed" : "expanded";
    try {
      window.localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "expanded");
    } catch {
      /* ignore write failures (private mode, etc.) */
    }
  }, [sidebarCollapsed]);

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
