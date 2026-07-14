"use client";

// Left navigation rail of the "Research OS" workbench (ported from SYSDesigner).
// AgentLab is a single linear 3-stop loop, so the rail is a flat list of stops
// rather than a chapter tree. The STOP list + active-stop rule are exported so
// the toolbar and command palette share the same source.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ui, useLang, t, type L } from "@/lib/i18n";
import { useShell } from "./theme-provider";
import { BrandMark } from "./logo";

export type SideStop = { href: string; glyph: string; label: L };

// The three stops of the learning loop, in order.
export const STOPS: SideStop[] = [
  { href: "/", glyph: "1", label: ui.nav.stop1 },
  { href: "/loop", glyph: "2", label: ui.nav.stop2 },
  { href: "/build", glyph: "3", label: ui.nav.stop3 },
];

// Which stop is active for a given path ("/loop/x" still counts as /loop).
export function activeStopIndex(path: string): number {
  if (path === "/") return 0;
  const i = STOPS.findIndex(
    (s) => s.href !== "/" && (path === s.href || path.startsWith(s.href + "/")),
  );
  return i === -1 ? 0 : i;
}

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

        <nav className="side-nav" aria-label="Stops">
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
