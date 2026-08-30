// The stops of the course, in order — the single source of truth shared by the
// sidebar rail, the toolbar breadcrumb, and the ⌘K command palette.
//
// It lives in lib/ rather than in the sidebar component so that the list is data
// rather than part of a React tree: verify.mjs imports it directly and checks
// that every href here has a page behind it.
//
// The stops are grouped, and each group says in one line why it follows the one
// before it. Fourteen stops is a lot to hand someone as a flat list; the groups
// are the difference between a list and a path. The number shown against a stop
// comes from its position, so inserting one is a single line.

import { ui, type L } from "@/lib/i18n";
import { ORDER } from "@/lib/order";

export type SideStop = { href: string; glyph: string; label: L; group: number };

export type StopGroup = {
  name: L;
  // 为什么这一组接在上一组后面
  why: L;
  hrefs: string[];
};

const GROUP_META: Omit<StopGroup, "hrefs">[] = [
  {
    name: { zh: "它是什么", en: "What it is" },
    why: {
      zh: "从零开始：一个数组，一个循环，然后你自己写一遍。",
      en: "From nothing: one array, one loop, and then you write it yourself.",
    },
  },
  {
    name: { zh: "模型是什么脾气", en: "What the model is like" },
    why: {
      zh: "会写它之后，先认识你正在指挥的那个东西：它每次不一样，而且它会编。",
      en: "Once you can write one, meet the thing you are directing: it varies, and it invents.",
    },
  },
  {
    name: { zh: "你写的那些文本", en: "The text you write" },
    why: {
      zh: "既然它靠读文字决定做什么，那你写的每一段文字都是控制手段——先看最有效的两种。",
      en: "Since it decides by reading text, every passage you write is a control. These are the two that matter most.",
    },
  },
  {
    name: { zh: "它的代价", en: "What it costs" },
    why: {
      zh: "控制住了行为，接下来是账单和上限——两者都来自同一件事：数组每一轮都要重发。",
      en: "With behaviour under control, next come the bill and the ceiling, both from one fact: the array is resent every round.",
    },
  },
  {
    name: { zh: "出问题的时候", en: "When it goes wrong" },
    why: {
      zh: "前面都假设一切按计划走。这一组假设不按计划：外面的文字在骗它，动作不可撤销，调用失败了。",
      en: "Everything so far assumed things go to plan. This group assumes they do not: text that lies to it, actions that cannot be undone, calls that fail.",
    },
  },
  {
    name: { zh: "怎么知道", en: "How you know" },
    why: {
      zh: "上面每一站都给了你一个可以改的东西。最后一组是怎么确认改动真的让它变好了，以及接下来去哪。",
      en: "Every stop above hands you something to change. This group is how you tell whether a change helped, and where to go next.",
    },
  },
];

export const GROUPS: StopGroup[] = GROUP_META.map((g, i) => ({
  ...g,
  hrefs: ORDER.filter((s) => s.group === i).map((s) => s.href),
}));

const LABELS: Record<string, L> = {
  "/": ui.nav.whatIs,
  "/loop": ui.nav.loop,
  "/build": ui.nav.build,
  "/chance": ui.nav.chance,
  "/invent": ui.nav.invent,
  "/instructions": ui.nav.instructions,
  "/tools": ui.nav.tools,
  "/cost": ui.nav.cost,
  "/context": ui.nav.context,
  "/trust": ui.nav.trust,
  "/permission": ui.nav.permission,
  "/again": ui.nav.again,
  "/measure": ui.nav.measure,
  "/next": ui.nav.next,
};

// Routes that are not stops but are still real pages. /all is the whole course
// on one page, for someone who has read it once and wants one paragraph back.
export const VIEWS: string[] = ["/all"];

export const STOPS: SideStop[] = GROUPS.flatMap((g, gi) =>
  g.hrefs.map((href) => ({ href, label: LABELS[href], group: gi })),
).map((s, i) => ({ ...s, glyph: String(i + 1) }));

// Which stop is active for a given path ("/loop/x" still counts as /loop).
export function activeStopIndex(path: string): number {
  if (path === "/") return 0;
  const i = STOPS.findIndex(
    (s) => s.href !== "/" && (path === s.href || path.startsWith(s.href + "/")),
  );
  return i === -1 ? 0 : i;
}
