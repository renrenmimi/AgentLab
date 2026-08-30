// The stops of the course, in order — the single source of truth shared by the
// sidebar rail, the toolbar breadcrumb, and the ⌘K command palette.
//
// It lives in lib/ rather than in the sidebar component so that the list is data
// rather than part of a React tree: verify.mjs imports it directly and checks
// that every href here has a page behind it.

import { ui, type L } from "@/lib/i18n";

export type SideStop = { href: string; glyph: string; label: L };

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
