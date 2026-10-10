"use client";

// Left navigation rail of the "Research OS" workbench (ported from SYSDesigner).
// The course is a single linear sequence of stops, so the rail is a flat list
// rather than a chapter tree. The list itself and the active-stop rule live in
// lib/stops.ts, shared with the toolbar and the command palette.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ui, useLang, t } from "@/lib/i18n";
import { GROUPS, STOPS } from "@/lib/stops";
import { useProgress } from "./progress";
import { useShell } from "./theme-provider";
import { BrandMark } from "./logo";

export default function Sidebar() {
  const path = usePathname();
  const { lang } = useLang();
  const { sidebarOpen, setSidebarOpen } = useShell();

  const { visited, reset } = useProgress();
  const progress = Math.round((visited.size / STOPS.length) * 100);

  const close = () => setSidebarOpen(false);

  // At drawer widths (≤960px, the breakpoint in globals.css) a closed drawer is
  // only moved off-screen, so it is made inert: its links leave the Tab order
  // and the accessibility tree instead of being sixteen invisible stops before
  // the page. The open drawer is a modal: focus moves into it, Tab stays in it,
  // Escape closes it, the page behind is inert, and focus goes back to the menu
  // button afterwards.
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 960px)");
    const sync = () => setDrawer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const asideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const aside = asideRef.current;
    if (!sidebarOpen || !drawer || !aside) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const behind = document.querySelector<HTMLElement>(".main-col");
    behind?.setAttribute("inert", "");
    const stops = () =>
      Array.from(aside.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
    (aside.querySelector<HTMLElement>('[aria-current="page"]') ?? stops()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSidebarOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const list = stops();
      if (list.length === 0) return;
      const at = list.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && at <= 0) {
        e.preventDefault();
        list[list.length - 1].focus();
      } else if (!e.shiftKey && (at === -1 || at === list.length - 1)) {
        e.preventDefault();
        list[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      behind?.removeAttribute("inert");
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [sidebarOpen, drawer, setSidebarOpen]);

  return (
    <>
      <aside
        ref={asideRef}
        className={`sidebar${sidebarOpen ? " open" : ""}`}
        aria-label={t(ui.brand.name, lang)}
        inert={drawer && !sidebarOpen}
      >
        {/* Only shown at drawer widths, where the open drawer covers the menu button. */}
        <button
          type="button"
          className="side-close"
          onClick={close}
          aria-label={t(ui.toolbar.hideNav, lang)}
        >
          <span aria-hidden>✕</span>
        </button>
        <Link href="/" className="brand" onClick={close} aria-label="AgentLab">
          <span className="brand-mark" aria-hidden>
            <BrandMark />
          </span>
          <span className="brand-text">
            <span className="brand-name">{t(ui.brand.name, lang)}</span>
            <span className="brand-tagline">{t(ui.brand.tagline, lang)}</span>
          </span>
        </Link>

        <nav className="side-nav" aria-label={t(ui.a11y.stops, lang)}>
          {GROUPS.map((group, gi) => (
            <div
              key={gi}
              className="side-group"
              role="group"
              aria-label={t(group.name, lang)}
            >
              <div className="side-group-name" aria-hidden>
                {t(group.name, lang)}
              </div>
              <p className="side-group-why">{t(group.why, lang)}</p>
              {STOPS.filter((s) => s.group === gi).map((s) => {
                const active = s.href === path;
                const read = visited.has(s.href) && !active;
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    className={`side-link${active ? " active" : ""}${read ? " read" : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={close}
                  >
                    <span className="side-glyph" aria-hidden>
                      {s.glyph}
                    </span>
                    <span className="side-label">{t(s.label, lang)}</span>
                    {read && (
                      <span className="side-read" title={t(ui.side.done, lang)}>
                        ✓<span className="sr-only"> {t(ui.side.done, lang)}</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <Link href="/all" className="side-all" onClick={close}>
          {t(ui.all.link, lang)} →
        </Link>

        <div className="side-status">
          <div className="eyebrow">{t(ui.side.status, lang)}</div>
          <div className="side-status-label">
            {visited.size} / {STOPS.length} {t(ui.side.visited, lang)}
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <button
            type="button"
            className="side-reset"
            onClick={reset}
            disabled={visited.size === 0}
            title={t(ui.side.resetHint, lang)}
          >
            {t(ui.side.reset, lang)}
          </button>
        </div>
      </aside>

      <div
        className={`scrim${sidebarOpen ? " open" : ""}`}
        aria-hidden
        onClick={close}
      />
    </>
  );
}
