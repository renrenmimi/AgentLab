// 整门课的一份统一视图。
//
// 每一站的数据形状本来是不一样的：开场是六幕、第 2 站是若干步、第 3 站是八个空、
// 第 4 站往后是 meta + blocks。想做「一页读完」和「全站搜索」，就得先有一份
// 与形状无关的东西：站点 → 若干小节 → 若干段文字。
//
// 这份适配是 /all、命令面板的搜索、以及 verify.mjs 三处共用的，
// 所以「课程里有哪些文字」只有一个答案。

import type { L } from "@/lib/i18n";
import { ui } from "@/lib/i18n";
import { STOPS } from "@/lib/stops";
import { scenes } from "@/lib/intro";
import { scenarios } from "@/lib/scenarios";
import { blanks } from "@/lib/build";
import * as chance from "@/lib/chance";
import * as invent from "@/lib/invent";
import * as instructions from "@/lib/instructions";
import * as tools from "@/lib/tools";
import * as cost from "@/lib/cost";
import * as context from "@/lib/context";
import * as trust from "@/lib/trust";
import * as permission from "@/lib/permission";
import * as again from "@/lib/again";
import * as measure from "@/lib/measure";
import * as next from "@/lib/next";
import { checks } from "@/lib/checks";

export type Section = {
  // 锚点用的 id，形如 cost-2；链接可以指到某一段
  id: string;
  heading: L;
  paras: L[];
  // 这一节在原页面上是一块互动，这里只留结论
  staticNote?: boolean;
};

export type CourseStop = {
  href: string;
  glyph: string;
  title: L;
  subtitle: L;
  sections: Section[];
};

type LessonModule = {
  meta: { title: L; subtitle: L; takeaway: L };
  blocks: { title: L; paras: L[]; faq?: { q: L; a: L } }[];
};

const slug = (href: string) => (href === "/" ? "start" : href.slice(1));

function fromLesson(href: string, mod: LessonModule): Section[] {
  const s = slug(href);
  const out: Section[] = mod.blocks.map((b, i) => ({
    id: `${s}-${i + 1}`,
    heading: b.title,
    paras: b.faq ? [...b.paras, b.faq.q, b.faq.a] : b.paras,
  }));
  out.push({
    id: `${s}-takeaway`,
    heading: ui.lesson.takeaway,
    paras: [mod.meta.takeaway],
  });
  return out;
}

const LESSONS: Record<string, LessonModule> = {
  "/chance": chance,
  "/invent": invent,
  "/instructions": instructions,
  "/tools": tools,
  "/cost": cost,
  "/context": context,
  "/trust": trust,
  "/permission": permission,
  "/again": again,
  "/measure": measure,
  "/next": next,
};

function sectionsFor(href: string): Section[] {
  const s = slug(href);

  if (href === "/") {
    return scenes.map((scene, i) => ({
      id: `${s}-${i + 1}`,
      heading: scene.title,
      paras: [scene.text],
    }));
  }

  if (href === "/loop") {
    // 五次运行里，顺利那次是对照组，也是这一站的主线。
    const run = scenarios[0];
    const out: Section[] = run.steps.map((step, i) => ({
      id: `${s}-${i + 1}`,
      heading: step.title,
      paras: step.faq
        ? [step.narration, step.faq.q, step.faq.a]
        : [step.narration],
    }));
    out.push({
      id: `${s}-runs`,
      heading: {
        zh: "另外四次运行",
        en: "The other four runs",
      },
      paras: scenarios.slice(1).map((r) => ({
        zh: `${r.name.zh}：${r.tagline.zh}`,
        en: `${r.name.en}: ${r.tagline.en}`,
      })),
      staticNote: true,
    });
    return out;
  }

  if (href === "/build") {
    return blanks
      .filter((b) => b.lesson)
      .map((b, i) => ({
        id: `${s}-${i + 1}`,
        heading: b.q,
        paras: [b.lesson as L, b.explain],
      }));
  }

  const lesson = LESSONS[href];
  return lesson ? fromLesson(href, lesson) : [];
}

function titleFor(href: string): { title: L; subtitle: L } {
  if (href === "/") return { title: ui.intro.title, subtitle: ui.intro.subtitle };
  if (href === "/loop") return { title: ui.loop.title, subtitle: ui.loop.subtitle };
  if (href === "/build") return { title: ui.build.title, subtitle: ui.build.subtitle };
  const lesson = LESSONS[href];
  return lesson
    ? { title: lesson.meta.title, subtitle: lesson.meta.subtitle }
    : { title: { zh: href, en: href }, subtitle: { zh: "", en: "" } };
}

export const COURSE: CourseStop[] = STOPS.map((stop) => ({
  href: stop.href,
  glyph: stop.glyph,
  ...titleFor(stop.href),
  sections: sectionsFor(stop.href),
}));

// 每一组结尾那次检验的题目，也算课程的一部分，搜索时应该找得到。
export const CHECK_SECTIONS: { href: string; section: Section }[] = checks.map((c) => ({
  href: c.on,
  section: {
    id: `${slug(c.on)}-check`,
    heading: c.title,
    paras: [c.intro, ...c.questions.map((q) => q.ask)],
    staticNote: true,
  },
}));
