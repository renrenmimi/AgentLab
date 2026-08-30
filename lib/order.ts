// 站点的顺序，只有 href，没有任何 import。
//
// lib/stops.ts 要从 lib/i18n.tsx 取站点名，而那是一个 "use client" 模块——
// 服务端（比如生成分享卡片的那个路由）拿不到它的导出。顺序本身不需要文案，
// 所以单独放在这里，两边都能用。

export const ORDER: { href: string; group: number }[] = [
  { href: "/", group: 0 },
  { href: "/loop", group: 0 },
  { href: "/build", group: 0 },
  { href: "/chance", group: 1 },
  { href: "/invent", group: 1 },
  { href: "/instructions", group: 2 },
  { href: "/tools", group: 2 },
  { href: "/cost", group: 3 },
  { href: "/context", group: 3 },
  { href: "/trust", group: 4 },
  { href: "/permission", group: 4 },
  { href: "/again", group: 4 },
  { href: "/measure", group: 5 },
  { href: "/next", group: 5 },
];

export const HREFS = ORDER.map((s) => s.href);
