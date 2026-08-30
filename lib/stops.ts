// The stops of the course, in order — the single source of truth shared by the
// sidebar rail, the toolbar breadcrumb, and the ⌘K command palette.
//
// It lives in lib/ rather than in the sidebar component so that the list is data
// rather than part of a React tree: verify.mjs imports it directly and checks
// that every href here has a page behind it.
//
// The number shown against a stop comes from its position, so inserting one is
// a single line and nothing else has to be renumbered.

import { ui, type L } from "@/lib/i18n";

export type SideStop = { href: string; glyph: string; label: L };

const ORDER: { href: string; label: L }[] = [
  // 先建立心智模型
  { href: "/", label: ui.nav.whatIs },
  { href: "/loop", label: ui.nav.loop },
  { href: "/build", label: ui.nav.build },
  // 模型本身是什么脾气
  { href: "/chance", label: ui.nav.chance },
  { href: "/invent", label: ui.nav.invent },
  // 你写的那些文本，怎么改变它的行为
  { href: "/instructions", label: ui.nav.instructions },
  { href: "/tools", label: ui.nav.tools },
  // 数组变长的两个后果，以及一种躲开它的办法
  { href: "/cost", label: ui.nav.cost },
  { href: "/context", label: ui.nav.context },
  { href: "/delegate", label: ui.nav.delegate },
  // 出问题的时候
  { href: "/trust", label: ui.nav.trust },
  { href: "/permission", label: ui.nav.permission },
  // 怎么知道自己做对了
  { href: "/measure", label: ui.nav.measure },
];

export const STOPS: SideStop[] = ORDER.map((s, i) => ({
  ...s,
  glyph: String(i + 1),
}));

// Which stop is active for a given path ("/loop/x" still counts as /loop).
export function activeStopIndex(path: string): number {
  if (path === "/") return 0;
  const i = STOPS.findIndex(
    (s) => s.href !== "/" && (path === s.href || path.startsWith(s.href + "/")),
  );
  return i === -1 ? 0 : i;
}
