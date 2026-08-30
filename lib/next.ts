// 「这门课没讲的」：把边界说清楚，然后指个方向。
// 一门课讲完，最后一件该做的事是承认它讲到哪为止。

import type { L } from "@/lib/i18n";
import type { Block, LessonMeta } from "@/lib/lesson";

export type Area = {
  id: string;
  name: L;
  what: L;
  // 为什么这门课没讲
  why: L;
  // 接下来该看什么
  where: L;
  link?: { href: string; label: string };
};

export const areas: Area[] = [
  {
    id: "real",
    name: { zh: "看一次没有被安排过的运行", en: "Watch a run nobody arranged" },
    what: {
      zh:
        "这门课从头到尾用的都是写好的运行：每一步的内容、每一个 token 数字，" +
        "都是为了把一件事讲清楚而挑出来的。",
      en:
        "Every run in this course was written: each step and each token count was chosen to make one point " +
        "clearly.",
    },
    why: {
      zh:
        "真实运行不这么整齐。它更长、更乱，中间有大段没意思的重复，" +
        "偶尔冒出一个你从没想过的错误。教学需要整齐，理解需要不整齐。",
      en:
        "Real runs are not that tidy. They are longer and messier, with long stretches of dull repetition and " +
        "the occasional failure nobody would have thought to write. Teaching needs the tidy version; " +
        "understanding needs the other one.",
    },
    where: {
      zh:
        "AgentTape 回放一次真实发生过的 Claude Code 会话：一条时间线、" +
        "一个不断变长的 messages 数组、以及 token 花在了哪里。" +
        "你在[[stop:/loop]]学会的读法，在那里可以直接用上。",
      en:
        "AgentTape replays a Claude Code session that already happened: a timeline, the messages array as it " +
        "grew, and where the tokens went. The way of reading you picked up at [[stop:/loop]] works there unchanged.",
    },
    link: { href: "https://github.com/renrenmimi/AgentTape", label: "AgentTape" },
  },
  {
    id: "frameworks",
    name: { zh: "框架", en: "Frameworks" },
    what: {
      zh:
        "这门课里的循环是手写的三十来行。真实项目里，这部分通常由一个框架提供：" +
        "工具注册、重试、状态保存、并发、追踪，都已经写好了。",
      en:
        "The loop in this course is thirty-odd hand-written lines. In a real project that part usually comes " +
        "from a framework: tool registration, retries, state, concurrency and tracing are already written.",
    },
    why: {
      zh:
        "先手写一遍是有意的。框架把这个循环藏起来，而藏起来的东西出问题时，" +
        "你需要知道它藏的是什么——这门课全部十四站讲的都是那个东西。" +
        "顺序反过来的话，你会得到一个能跑但说不清为什么的系统。",
      en:
        "Writing it by hand first is deliberate. A framework hides this loop, and when something hidden goes " +
        "wrong you need to know what was hidden — which is what all fourteen stops were about. In the other " +
        "order you end up with a system that runs and that you cannot explain.",
    },
    where: {
      zh:
        "现在再去读框架文档，会容易得多：你已经知道它的 run() 里面在做什么，" +
        "也知道该问哪些问题——工具结果怎么截断、失败怎么重试、上下文满了它做什么、审批挂在哪一层。",
      en:
        "Framework documentation reads much more easily now: you know what is inside its run(), and you know " +
        "which questions to ask — how tool results are truncated, how failures are retried, what it does when " +
        "the context fills, and where approval hangs.",
    },
  },
  {
    id: "evals",
    name: { zh: "认真做评测", en: "Evaluation in earnest" },
    what: {
      zh:
        "[[stop:/measure]]给的是最小可用的那一版：十个任务、一个通过数、手工判。" +
        "真正做起来还有很多：更大的任务集、自动判分、按类别分层看、" +
        "在每次改动上跑而不是想起来才跑、以及把线上出的问题不断补回集合里。",
      en:
        "[[stop:/measure]] gives the smallest version that works: ten tasks, a pass count, judged by hand. Doing it " +
        "properly involves more — larger sets, automated grading, results broken out by category, running on " +
        "every change rather than when you remember, and feeding production failures back into the set.",
    },
    why: {
      zh:
        "因为十条手工判的用例已经能挡住绝大多数「我以为改好了」的情况，" +
        "而一套完整的评测体系需要的投入，会让还没开始的人干脆不开始。" +
        "先有十条，再谈别的。",
      en:
        "Because ten hand-judged cases already catch most of the I thought that fixed it cases, and the " +
        "investment a full evaluation setup asks for is enough to stop someone starting at all. Get ten " +
        "first; talk about the rest afterwards.",
    },
    where: {
      zh:
        "下一步通常是两件事：把判分规则写成代码（哪怕只是几个正则和几个断言），" +
        "以及把评测接进 CI，让它在每次改提示词的时候自动跑。" +
        "这两步之后，你才会开始需要那些更大的工具。",
      en:
        "The next two moves are usually to write the pass conditions as code — even if that is a few regular " +
        "expressions and a few assertions — and to run the set in CI so it fires on every prompt change. " +
        "After those two, the larger tooling starts to be worth its cost.",
    },
  },
  {
    id: "multi",
    name: { zh: "多个 agent", en: "Multi-agent systems" },
    what: {
      zh:
        "[[stop:/delegate]]只讲了最简单的一种：一个父 agent 把一段活交给一个子 agent。" +
        "再往上还有很多形态——多个 agent 并行、互相评审、按角色分工、共享一块状态。",
      en:
        "[[stop:/delegate]] covers only the simplest arrangement: a parent hands a stretch of work to a subagent. Beyond " +
        "it there are many shapes — agents in parallel, reviewing each other, split by role, sharing state.",
    },
    why: {
      zh:
        "因为这个领域里能确定的结论还不多，而不确定的东西不适合放进一门讲基础的课。" +
        "更实际的一条理由是：绝大多数「需要多个 agent」的问题，" +
        "换成一个 agent 加几个更好的工具就解决了，而且更便宜、更好查。",
      en:
        "Because there is not much settled knowledge here yet, and unsettled material does not belong in a " +
        "course about fundamentals. The more practical reason: most problems that look like they need several " +
        "agents are solved by one agent with better tools, more cheaply and with less to debug.",
    },
    where: {
      zh:
        "如果你确实要做，[[stop:/delegate]]那条边界的代价是最值得带着的东西：" +
        "每加一层，外面那一层就少看见一层里面发生的事。" +
        "多 agent 系统里最常见的失败，不是某个 agent 做错了，是没有人看得见它做错了。",
      en:
        "If you do go there, the thing worth carrying from [[stop:/delegate]] is the cost of a boundary: each layer you " +
        "add is a layer the outer one can no longer see into. The common failure in these systems is not that " +
        "an agent got something wrong; it is that nobody could see that it had.",
    },
  },
];

// ---------------------------------------------------------------- 文案

export const meta: LessonMeta = {
  title: { zh: "这门课没讲的", en: "What this course left out" },
  subtitle: {
    zh: "一门课讲完，最后该做的事是说清楚它讲到哪为止，以及接下来往哪走。",
    en: "The last thing a course should do is say where it stops, and where to go from there.",
  },
  takeaway: {
    zh:
      "十四站讲完，你手里有的是一个能拆开的心智模型：" +
      "一个数组、一个循环、几段你写的文字、几个你给的工具，以及它们各自会怎么坏。" +
      "**这个模型的用处不在于它完整，而在于遇到没见过的东西时，你知道该拆哪一层。**",
    en:
      "After fourteen stops what you have is a mental model you can take apart: one array, one loop, some " +
      "text you wrote, some tools you supplied, and the ways each of them breaks. **Its value is not that it " +
      "is complete but that when you meet something you have not seen, you know which layer to open.**",
  },
};

export const blocks: Block[] = [
  {
    title: { zh: "先说回顾", en: "What you have" },
    paras: [
      {
        zh:
          "「它是什么」给了你形状：[[array:数组]]加循环，然后你亲手写了一遍。" +
          "「模型是什么脾气」是它本身的两个性质：它每次不一样（[[stop:/chance]]），它会编（[[stop:/invent]]）。" +
          "「你写的那些文本」是你能写的两种东西，以及它们各自能改变什么。" +
          "「它的代价」是钱、上限、以及一种把代价推到别处的办法。" +
          "「出问题的时候」是不按计划走：文字在骗它、动作撤不回来、调用失败了。" +
          "「怎么知道」是怎么确认你的改动真的有用（[[stop:/measure]]）。",
        en:
          "What it is gave you the shape: an [[array:array]] and a loop, and then you wrote one. What " +
          "the model is like covers two properties of the model itself: it varies ([[stop:/chance]]) " +
          "and it invents ([[stop:/invent]]). The text you write covers the two kinds of text you " +
          "write and what each can change. What it costs is money, a ceiling, and one way of pushing " +
          "both somewhere else. When it goes wrong is everything off-plan: text that lies to it, " +
          "actions that cannot be undone, calls that fail. How you know is how you tell whether a " +
          "change helped ([[stop:/measure]]).",
      },
      {
        zh:
          "这些站之间不是并列的知识点，它们共用同一个结构：" +
          "凡是模型知道的，都在那个数组里；凡是它能做的，都在那份工具列表里。" +
          "遇到一个没见过的行为时，先问这两句，通常就已经定位到了。",
        en:
          "These are not parallel facts; they share one structure. Everything the model knows is in that " +
          "array, and everything it can do is in that tool list. Faced with behaviour you have not seen " +
          "before, asking those two questions usually locates it.",
      },
    ],
  },
  {
    title: { zh: "四个方向", en: "Four directions" },
    paras: [
      {
        zh:
          "上面四块是这门课明确没有覆盖的地方。每一块都写了「为什么没讲」，" +
          "因为那个理由通常比内容本身更有用——它告诉你什么时候该去看，什么时候还不必。",
        en:
          "The four areas above are what this course deliberately does not cover. Each says why, because the " +
          "reason is usually more useful than the material: it tells you when to go and look, and when you do " +
          "not need to yet.",
      },
    ],
  },
];

export const bench = {
  title: { zh: "接下来", en: "Where to go" },
  note: { zh: "四个方向", en: "four directions" },
  whatWord: { zh: "是什么", en: "What it is" },
  whyWord: { zh: "为什么这门课没讲", en: "Why this course left it out" },
  whereWord: { zh: "接下来看什么", en: "Where to go" },
};
