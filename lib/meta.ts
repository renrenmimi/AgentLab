// 每一站自己的 <title> 和描述。
//
// 一句一句写的，不是套模板：这两行是别人在搜索结果或者一条分享链接里
// 唯一看得到的东西，应该读起来像一个打开它的理由。
//
// 服务端渲染的 <head> 对所有人是同一份，所以标签用英文那一版；
// 中文同时写在这里，一方面是双语规则要求，一方面将来要做多语言路由时它已经在了。

import type { L } from "@/lib/i18n";

export type StopSeo = { title: L; description: L };

export const SITE = {
  name: "AgentLab",
  title: {
    zh: "AgentLab — 看得见的 Agent",
    en: "AgentLab — See inside the agent",
  },
  description: {
    zh: "十四站的互动课程，把一个会用工具的 AI agent 拆开：messages 数组、工具、以及把它们串起来的那个循环。中英双语。",
    en: "A fourteen-stop interactive course that takes a tool-using AI agent apart: the messages array, the tools, and the loop that ties them together. In English and Chinese.",
  },
} as const;

export const SEO: Record<string, StopSeo> = {
  "/": {
    title: { zh: "什么是 Agent", en: "What is an agent" },
    description: {
      zh: "从「模型只会把文字变成文字」讲到「一个会调用工具的循环」，六幕动画，一行代码都不用看。",
      en: "From a model that only turns text into text to a program that loops and calls tools. Six animated scenes, not a line of code.",
    },
  },
  "/loop": {
    title: { zh: "看它怎么跑", en: "Watch an agent run, one step at a time" },
    description: {
      zh: "五次录下来的运行，一次顺利、四次出问题：停不下来的循环、选错的工具、装不下的历史、失败的工具。每次出问题的都以「改掉之后重放一遍」收尾。",
      en: "Five recorded runs: one clean and four that go wrong — a loop that will not stop, the wrong tool, a history that no longer fits, a tool that fails. Each failure ends by replaying itself with the mistake fixed.",
    },
  },
  "/build": {
    title: { zh: "亲手写一个 agent", en: "Write an agent yourself" },
    description: {
      zh: "在一份三十行的骨架里填八个空。每个空先教会你它需要的概念，答错时告诉你错在哪个念头上。",
      en: "Fill in eight blanks in a thirty-line skeleton. Each blank teaches the concept it needs before it asks, and every wrong answer names the idea it came from.",
    },
  },
  "/chance": {
    title: { zh: "为什么同一个问题每次答得不一样", en: "Why the same question gives different answers" },
    description: {
      zh: "采样和温度，不用数学讲。然后是那条推论：agent 不是一个函数，所以「我试过，能用」只是一次采样。",
      en: "Sampling and temperature, without the maths. Then the consequence: an agent is not a function, so “it worked when I tried it” is one sample rather than evidence.",
    },
  },
  "/invent": {
    title: { zh: "它为什么会编", en: "Why an AI makes things up" },
    description: {
      zh: "一句流利的错话和一句流利的对话，在模型内部是同一种东西。三个问题在「有工具」和「没工具」两种条件下的对照——这正是工具存在的理由。",
      en: "A fluent wrong answer and a fluent right one are the same kind of object inside the model. Three questions asked with and without tools, which is what tools are for.",
    },
  },
  "/instructions": {
    title: { zh: "system 提示词能做什么，不能做什么", en: "What a system prompt can and cannot do" },
    description: {
      zh: "它在 messages 之外，却每一轮都重发一次，也每一轮计一次费。同一个任务三种条件：什么都不说、加一句叮嘱、把那个工具删掉。",
      en: "It sits outside messages and is re-sent, and re-paid for, every round. The same task under three conditions: say nothing, add a sentence, or remove the tool.",
    },
  },
  "/tools": {
    title: { zh: "怎么描述一个工具，模型才会用对", en: "How to describe a tool so a model uses it correctly" },
    description: {
      zh: "工具的 description 是提示词，不是给同事看的文档。三个任务，三种漏写：它不做什么、这组工具的边界在哪、返回多少。",
      en: "A tool description is a prompt, not documentation. Three tasks and three omissions: what it does not do, where the toolset stops, and how much comes back.",
    },
  },
  "/cost": {
    title: { zh: "一次 agent 运行为什么这么贵", en: "Why an agent run costs what it costs" },
    description: {
      zh: "整个数组每一轮都要重发，所以花费随轮数的平方增长。拖动滑块看曲线变弯，再打开缓存看它变缓——但依然是弯的。",
      en: "The whole array is resent every round, so spending grows with the square of the rounds. Drag the slider and watch the curve bend; switch caching on and watch it bend less, and still bend.",
    },
  },
  "/context": {
    title: { zh: "上下文装不下的时候", en: "When the context window will not fit" },
    description: {
      zh: "token 是什么、上下文窗口是什么，以及到顶之后的四条路：拒绝、截断、摘要、交给另一个 agent。四条都在同一段对话上演一遍，看各自丢了什么。",
      en: "What a token is, what a context window is, and the four ways past a full one: refuse, truncate, summarise, or hand the work to another agent — all four applied to the same conversation.",
    },
  },
  "/trust": {
    title: { zh: "工具返回的内容不可信", en: "Tool output is not your friend" },
    description: {
      zh: "提示注入：先演示再命名。同一个网页，人看到的和进入数组的是两回事。然后是几种缓解办法，以及每一种挡不住什么。",
      en: "Prompt injection, shown before it is named: one page, and what a person sees is not what enters the array. Then the mitigations, each with what it does not stop.",
    },
  },
  "/permission": {
    title: { zh: "谁来决定 agent 可以做什么", en: "Who decides what an agent may do" },
    description: {
      zh: "循环停在一次写入之前，由你来批准。只这一次、以后都允许、拒绝——三条分支的运行真的不一样，而「以后都允许」会演示那次你没看见的写入。",
      en: "The loop stops before a write and you make the call. Allow once, allow always, or refuse: the run continues differently for each, and allowing always shows the write that then happens without you.",
    },
  },
  "/again": {
    title: { zh: "工具调用失败之后该不该重试", en: "When a tool call fails, should you retry" },
    description: {
      zh: "失败有三种，其中一种你不知道那件事到底做没做——而重试会把它再做一遍。退避、次数上限，以及幂等：一次搜索和一次扣款的区别。",
      en: "A call fails three ways, and in one of them you do not know whether the work happened, which is the one a retry does twice. Backoff, attempt limits, and idempotency through a search and a payment.",
    },
  },
  "/measure": {
    title: { zh: "怎么知道你的改动真的让它变好了", en: "How to know a change actually improved anything" },
    description: {
      zh: "「感觉好多了」不是答案。十个存好的任务和一个通过数，以及一次修好三条、悄悄弄坏两条的提示词改动。",
      en: "“It seems better” is not an answer. Ten saved tasks and a pass count, and a prompt change that fixes three of them while quietly breaking two.",
    },
  },
  "/next": {
    title: { zh: "这门课没讲的", en: "What this course left out" },
    description: {
      zh: "课程到哪里为止、为什么，以及接下来去哪：看一次真实的运行、框架、认真做评测、多 agent 系统。",
      en: "Where the course stops, why, and where to go next: watching a real run, frameworks, evaluation in earnest, and multi-agent systems.",
    },
  },
  "/all": {
    title: { zh: "一页读完整门课", en: "The whole course on one page" },
    description: {
      zh: "十四站的正文按阅读顺序排在一页里，每个小标题都有锚点。给读过一遍、只想找回其中一段的人。",
      en: "The prose of all fourteen stops in reading order on one page, every heading anchored. For coming back for one paragraph.",
    },
  },
};

/** Next 的 metadata 对所有访客是同一份，所以标签取英文那一版。 */
export function stopMetadata(href: string) {
  const seo = SEO[href];
  if (!seo) return {};
  const title = `${seo.title.en} · ${SITE.name}`;
  const image = `/og?s=${encodeURIComponent(href)}`;
  return {
    title,
    description: seo.description.en,
    openGraph: {
      title,
      description: seo.description.en,
      siteName: SITE.name,
      type: "article" as const,
      images: [{ url: image, width: 1200, height: 630, alt: seo.title.en }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description: seo.description.en,
      images: [image],
    },
  };
}
