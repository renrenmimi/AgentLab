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
  // 前三站讲「agent 是什么」。后六站讲「为什么它难」，顺序是有意的：
  // 先讲数组变长带来的两个后果（钱、上下文上限），再讲工具的两端
  // （怎么描述它、它返回的东西能不能信），然后是把工作交出去，最后是怎么衡量。
  { href: "/cost", glyph: "4", label: ui.nav.stop4 },
  { href: "/context", glyph: "5", label: ui.nav.stop5 },
  { href: "/tools", glyph: "6", label: ui.nav.stop6 },
  { href: "/trust", glyph: "7", label: ui.nav.stop7 },
  // 批准紧跟在「工具结果不可信」后面：审批之所以存在，正是因为
  // 那段要求执行动作的文字未必出自你。
  { href: "/permission", glyph: "8", label: ui.nav.stop8 },
  { href: "/delegate", glyph: "9", label: ui.nav.stop9 },
  { href: "/measure", glyph: "10", label: ui.nav.stop10 },
];

// Which stop is active for a given path ("/loop/x" still counts as /loop).
export function activeStopIndex(path: string): number {
  if (path === "/") return 0;
  const i = STOPS.findIndex(
    (s) => s.href !== "/" && (path === s.href || path.startsWith(s.href + "/")),
  );
  return i === -1 ? 0 : i;
}
