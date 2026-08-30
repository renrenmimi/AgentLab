// 全站搜索。
//
// 索引就是 lib/course.ts 那份统一视图压平之后的样子：一条记录 = 一个小节。
// 没有依赖，也不发任何请求——十四站的双语正文压进去大约几万字符，
// 直接线性扫一遍就够快，为它引入一个搜索库是不划算的。
//
// 索引在第一次用到时才建（命令面板打开时），因此不影响任何一页的加载。

import { COURSE, CHECK_SECTIONS } from "@/lib/course";
import type { Lang, L } from "@/lib/i18n";

export type Hit = {
  href: string;
  anchor: string;
  stop: L;
  heading: L;
  // 命中的那一段，截到匹配点附近
  snippet: string;
  // 匹配点在 snippet 里的起止，供高亮用
  at: [number, number];
  score: number;
};

type Entry = {
  href: string;
  anchor: string;
  stop: L;
  heading: L;
  headingText: string;
  body: string;
};

let index: Record<Lang, Entry[]> | null = null;

function build(): Record<Lang, Entry[]> {
  const out: Record<Lang, Entry[]> = { zh: [], en: [] };
  const push = (
    href: string,
    stop: L,
    anchor: string,
    heading: L,
    paras: L[],
  ) => {
    for (const lang of ["zh", "en"] as Lang[]) {
      out[lang].push({
        href,
        anchor,
        stop,
        heading,
        headingText: heading[lang],
        // 标记对读者不可见，索引里也不该有
        body: paras.map((p) => strip(p[lang])).join(" "),
      });
    }
  };

  for (const stop of COURSE) {
    for (const section of stop.sections) {
      push(stop.href, stop.title, section.id, section.heading, section.paras);
    }
  }
  for (const { href, section } of CHECK_SECTIONS) {
    const stop = COURSE.find((s) => s.href === href);
    if (stop) push(href, stop.title, section.id, section.heading, section.paras);
  }
  return out;
}

/** 去掉正文里的标记，只留读者看得见的字。 */
export function strip(text: string): string {
  return text
    .replace(/\[\[stop:([^\]]+)\]\]/g, "")
    .replace(/\[\[\w+:([^\]]+)\]\]/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1");
}

export function search(query: string, lang: Lang, limit = 12): Hit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  if (!index) index = build();

  const hits: Hit[] = [];
  for (const entry of index[lang]) {
    const inHeading = entry.headingText.toLowerCase().indexOf(q);
    const body = entry.body;
    const inBody = body.toLowerCase().indexOf(q);
    if (inHeading === -1 && inBody === -1) continue;

    // 标题命中排在正文命中前面；两者都命中的最靠前。
    const score = (inHeading !== -1 ? 100 : 0) + (inBody !== -1 ? 10 : 0);

    let snippet = body;
    let at: [number, number] = [0, 0];
    if (inBody !== -1) {
      const start = Math.max(0, inBody - 60);
      const end = Math.min(body.length, inBody + q.length + 90);
      snippet = (start > 0 ? "…" : "") + body.slice(start, end) + (end < body.length ? "…" : "");
      const offset = inBody - start + (start > 0 ? 1 : 0);
      at = [offset, offset + q.length];
    } else {
      snippet = body.slice(0, 130) + (body.length > 130 ? "…" : "");
    }

    hits.push({
      href: entry.href,
      anchor: entry.anchor,
      stop: entry.stop,
      heading: entry.heading,
      snippet,
      at,
      score,
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
