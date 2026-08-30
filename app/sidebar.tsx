"use client";

// Left navigation rail of the "Research OS" workbench (ported from SYSDesigner).
// The course is a single linear sequence of stops, so the rail is a flat list
// rather than a chapter tree. The list itself and the active-stop rule live in
// lib/stops.ts, shared with the toolbar and the command palette.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ui, useLang, t } from "@/lib/i18n";
import { STOPS, activeStopIndex } from "@/lib/stops";
import { useShell } from "./theme-provider";
import { BrandMark } from "./logo";

export default function Sidebar() {
  const path = usePathname();
  const { lang } = useLang();
  const { sidebarOpen, setSidebarOpen } = useShell();

  const activeIndex = activeStopIndex(path);
  const progress = Math.round(((activeIndex + 1) / STOPS.length) * 100);

  const close = () => setSidebarOpen(false);

  return (
    <>
      <aside
        className={`sidebar${sidebarOpen ? " open" : ""}`}
        aria-label={t(ui.brand.name, lang)}
      >
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
          {STOPS.map((s, i) => {
            const active = i === activeIndex;
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`side-link${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={close}
              >
                <span className="side-glyph" aria-hidden>
                  {s.glyph}
                </span>
                <span className="side-label">{t(s.label, lang)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="side-status">
          <div className="eyebrow">{t(ui.side.status, lang)}</div>
          <div className="side-status-label">{t(ui.side.progress, lang)}</div>
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
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
