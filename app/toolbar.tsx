"use client";

// Sticky top toolbar of the workbench (ported from SYSDesigner).
// Left:  menu/collapse button + breadcrumb of the current stop.
// Middle: command-palette trigger (opens the ⌘K palette).
// Right:  language switch (中 / EN) + theme toggle (☾ / ☀).

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ui, useLang, t } from "@/lib/i18n";
import { useShell, useTheme } from "./theme-provider";
import { STOPS, activeStopIndex } from "@/lib/stops";

// Tracks the desktop breakpoint so one button can do the right thing:
// collapse the persistent rail on desktop, or toggle the drawer on mobile.
// Matches the ≤960px media query used throughout globals.css.
function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 961px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return desktop;
}

export default function Toolbar() {
  const path = usePathname();
  const { lang, setLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    setCmdkOpen,
  } = useShell();
  const isDesktop = useIsDesktop();

  const stop = STOPS[activeStopIndex(path)];

  // Desktop: is the rail currently showing? Mobile: is the drawer open?
  const navShown = isDesktop ? !sidebarCollapsed : sidebarOpen;
  const toggleNav = () => {
    if (isDesktop) toggleSidebarCollapsed();
    else setSidebarOpen((o) => !o);
  };

  return (
    <header className="toolbar">
      <button
        type="button"
        className="menu-btn"
        aria-label={t(navShown ? ui.toolbar.hideNav : ui.toolbar.showNav, lang)}
        aria-expanded={navShown}
        onClick={toggleNav}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <line x1="9" y1="4" x2="9" y2="20" />
        </svg>
      </button>

      <div className="crumb" aria-live="polite">
        <span className="crumb-chapter">{t(ui.brand.name, lang)}</span>
        <span className="crumb-sep" aria-hidden>
          /
        </span>
        <span className="crumb-stop">{t(stop.label, lang)}</span>
      </div>

      <button
        type="button"
        className="cmdk-trigger"
        onClick={() => setCmdkOpen(true)}
        aria-label={t(ui.cmdk.placeholder, lang)}
      >
        <span className="cmdk-trigger-icon" aria-hidden>
          ⌕
        </span>
        <span className="cmdk-trigger-text">{t(ui.toolbar.search, lang)}</span>
        <kbd>⌘K</kbd>
      </button>

      <div className="toolbar-actions">
        <div className="lang-switch" role="group" aria-label="Language">
          <button
            type="button"
            className={lang === "zh" ? "on" : ""}
            aria-pressed={lang === "zh"}
            onClick={() => setLang("zh")}
          >
            中
          </button>
          <button
            type="button"
            className={lang === "en" ? "on" : ""}
            aria-pressed={lang === "en"}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </div>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={t(theme === "dark" ? ui.theme.toLight : ui.theme.toDark, lang)}
        >
          <span aria-hidden>{theme === "dark" ? "☾" : "☀"}</span>
        </button>
      </div>
    </header>
  );
}
