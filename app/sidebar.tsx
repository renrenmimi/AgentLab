"use client";

// Left navigation rail of the "Research OS" workbench (ported from SYSDesigner).
// The course is a single linear sequence of stops, so the rail is a flat list
// rather than a chapter tree. The list itself and the active-stop rule live in
// lib/stops.ts, shared with the toolbar and the command palette.

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
          {GROUPS.map((group, gi) => (
            <div key={gi} className="side-group">
              <h2 className="side-group-name" title={t(group.why, lang)}>
                {t(group.name, lang)}
              </h2>
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
