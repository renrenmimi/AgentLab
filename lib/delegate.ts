// 第 8 站「让另一个 agent 去做」：一个想法，讲清楚就够。
// 父 agent 把一段工作整个交出去，换回一段摘要——省下的是上下文，付出的是可核对性。

import type { L } from "@/lib/i18n";
import type { Block, LessonMeta } from "@/lib/lesson";

export type Row = { label: L; parent: L; actual: L; parentBad?: boolean };

// 父 agent 看到的 / 实际发生的，同一件事的两本账。
export const ledger: Row[] = [
  {
    label: { zh: "轮数", en: "Rounds" },
    parent: { zh: "1 轮（发出去，拿回来）", en: "1 (asked, answered)" },
    actual: { zh: "31 轮（子 agent 自己跑的）", en: "31, inside the subagent" },
  },
  {
    label: { zh: "读了多少文件", en: "Files read" },
    parent: { zh: "看不到", en: "not visible" },
    actual: { zh: "30 个，其中 4 个被截断", en: "30, four of them truncated" },
    parentBad: true,
  },
  {
    label: { zh: "花掉的 token", en: "Tokens spent" },
    parent: { zh: "约 400（问 + 答）", en: "about 400 (question and answer)" },
    actual: { zh: "约 128,000", en: "about 128,000" },
  },
  {
    label: { zh: "父 agent 数组增加", en: "Growth of the parent array" },
    parent: { zh: "2 条消息，约 400 token", en: "2 messages, about 400 tokens" },
    actual: { zh: "同左——子 agent 的 62 条消息一条都没进来", en: "the same; none of the subagent's 62 messages came across" },
  },
  {
    label: { zh: "结论的依据", en: "What the conclusion rests on" },
    parent: { zh: "一段 300 token 的文字", en: "a 300-token passage" },
    actual: { zh: "30 个文件的实际内容", en: "the contents of 30 files" },
    parentBad: true,
  },
];

export const summary = {
  ask: {
    zh: "去看一遍 lib/ 下面的 30 个文件，告诉我哪些碰了鉴权。",
    en: "Read the 30 files under lib/ and tell me which ones touch authentication.",
  },
  got: {
    zh:
      "有 4 个文件涉及鉴权：lib/auth/session.ts（读写会话 cookie）、" +
      "lib/auth/verify.ts（校验 JWT）、lib/api/client.ts（附加 Authorization 头）、" +
      "lib/middleware.ts（未登录时重定向）。其余 26 个文件与鉴权无关。",
    en:
      "Four files touch authentication: lib/auth/session.ts (reads and writes the session cookie), " +
      "lib/auth/verify.ts (validates the JWT), lib/api/client.ts (attaches the Authorization header) and " +
      "lib/middleware.ts (redirects when signed out). The other 26 are unrelated.",
  },
  missed: {
    zh:
      "实际上还有第 5 个：lib/cache.ts 用用户 id 拼了缓存键，缓存没有按会话隔离。" +
      "子 agent 读到那个文件时内容被截断了，截断的那一段正好是这几行——" +
      "而它在总结里没有提这次截断。",
    en:
      "There is in fact a fifth: lib/cache.ts builds cache keys from the user id, so the cache is not " +
      "partitioned by session. The subagent read that file truncated, the truncated part is exactly those " +
      "lines — and its summary does not mention that anything was cut.",
  },
};

// ---------------------------------------------------------------- 文案

export const meta: LessonMeta = {
  title: { zh: "第 8 站 · 让另一个 agent 去做", en: "Stop 8 · Handing work to another agent" },
  subtitle: {
    zh: "把一段工作整个交出去，父 agent 的上下文只增加一条消息。省下的是上下文，付出的是可核对性。",
    en: "Hand a stretch of work to a second agent and the parent's context grows by one message. What you save is context; what you pay is the ability to check.",
  },
  takeaway: {
    zh:
      "子 agent 换来的是上下文，代价是父 agent 从此只能相信那段摘要——" +
      "它没有原始材料，也就没有任何办法发现摘要漏了什么。" +
      "所以该交出去的是「读得多、结论短、错了看得出来」的活；" +
      "反过来，如果一件事错了会静悄悄地错，就别隔着一层做。",
    en:
      "A subagent buys context, and the price is that the parent can now only trust the summary. It does not " +
      "hold the raw material, so it has no way to notice what the summary left out. Delegate the work that " +
      "reads a lot, concludes briefly, and fails visibly. When a mistake would fail quietly, do not put a " +
      "boundary in front of it.",
  },
};

export const blocks: Block[] = [
  {
    title: { zh: "为什么会想这么做", en: "Why you would do this" },
    paras: [
      {
        zh:
          "第 4 站和第 5 站的两条限制凑在一起，会逼出这个做法：" +
          "有些活必须读很多东西，但读完之后真正有用的结论只有几句话。" +
          "「把 lib/ 下面 30 个文件都看一遍，找出碰鉴权的那些」就是典型——" +
          "三十个文件进[[array:数组]]，之后每一轮都要重发一次，而最终你要的只是一份四五个文件的清单。",
        en:
          "The limits from stops 4 and 5 push you here together: some work requires reading a great deal, and " +
          "the useful conclusion is a few sentences long. \"Read the 30 files under lib/ and find the ones " +
          "that touch authentication\" is the shape — thirty files enter the [[array:array]] and are resent " +
          "every round afterwards, and what you actually wanted was a list of four or five names.",
      },
      {
        zh:
          "办法是开第二个 agent：它有自己的数组、自己的循环、自己的一份预算。" +
          "它读完三十个文件，跑三十一轮，然后只把结论交回来。" +
          "在父 agent 那边，这整件事就是一次工具调用：问出去一条消息，拿回来一条消息。",
        en:
          "The move is to start a second agent with its own array, its own loop and its own budget. It reads " +
          "the thirty files across thirty-one rounds and hands back only the conclusion. On the parent's side " +
          "the whole episode is one tool call: one message out, one message back.",
      },
    ],
  },
  {
    title: { zh: "边界的代价", en: "The cost of the boundary" },
    paras: [
      {
        zh:
          "把上面的开关切到「实际发生的」那一栏，看两个数字：" +
          "父 agent 的数组只多了大约 400 个 token，而这件事真实花掉的是十二万八千。" +
          "这正是它的价值所在——那十二万八千个 token 用完就散掉了，不会跟着父 agent 之后的每一轮反复重发。",
        en:
          "Flip the switch above to what actually happened and read two numbers: the parent's array grew by " +
          "about 400 tokens, and the episode cost a hundred and twenty-eight thousand. That is exactly the " +
          "point — those hundred and twenty-eight thousand are spent and gone, rather than being resent with " +
          "every later round of the parent.",
      },
      {
        zh:
          "代价在最后两行。父 agent 拿到的是一段三百 token 的文字，它没有那三十个文件，" +
          "所以它无法核对这段文字。这次的摘要漏了一个文件——" +
          "子 agent 读到 lib/cache.ts 时内容被截断了，而它在总结里没提这件事。" +
          "父 agent 读到的是一份读起来很完整的清单，没有任何地方显示它不完整。",
        en:
          "The price is in the last two rows. The parent holds a 300-token passage and does not hold the " +
          "thirty files, so it cannot check the passage. This summary missed a file: the subagent read " +
          "lib/cache.ts truncated and did not say so. What reached the parent is a list that reads as " +
          "complete, with nothing anywhere indicating that it is not.",
      },
      {
        zh:
          "注意这和第 2 站「吞掉错误」是同一个形状，只是放大了一层：" +
          "那次是一个工具没有把失败说出来，这次是一整个 agent 没有把截断说出来。" +
          "每加一层边界，就多一个地方可以悄悄丢掉信息，而外面那一层永远看不见里面发生了什么。",
        en:
          "Note that this is the shape from stop 2 again, one level up: there a tool failed to report a " +
          "failure, and here an entire agent failed to report a truncation. Every boundary you add is one more " +
          "place where information can quietly disappear, and the outer layer never sees inside the inner one.",
      },
    ],
    faq: {
      q: {
        zh: "那要不要让子 agent 把过程也交回来？",
        en: "Should the subagent hand back its working as well?",
      },
      a: {
        zh:
          "交回来就等于没省——那三十个文件又回到父 agent 的数组里了。" +
          "实用的折中是让子 agent 连同结论一起交回几样元数据：读了几个文件、有没有截断、" +
          "有没有工具失败、哪些地方它自己也不确定。这几行几乎不占地方，" +
          "却能把「静悄悄漏掉」变成「看得见的存疑」，而后者是可以处理的。",
        en:
          "Hand it all back and you have saved nothing: the thirty files are in the parent's array again. The " +
          "workable middle is to have the subagent return a little metadata alongside its conclusion — how " +
          "many files it read, whether anything was truncated, whether any tool failed, and where it was " +
          "unsure. Those lines cost almost nothing and turn a silent omission into a visible doubt, which is " +
          "something you can act on.",
      },
    },
  },
];

export const bench = {
  title: { zh: "两本账", en: "Two ledgers" },
  note: { zh: "同一次委派", en: "one delegation" },
  viewLabel: { zh: "看哪一本", en: "Which ledger" },
  parent: { zh: "父 agent 看到的", en: "What the parent sees" },
  parentHint: { zh: "一问一答", en: "one question, one answer" },
  actual: { zh: "实际发生的", en: "What actually happened" },
  actualHint: { zh: "子 agent 里面的 31 轮", en: "31 rounds inside the subagent" },
  askWord: { zh: "父 agent 问", en: "The parent asks" },
  gotWord: { zh: "子 agent 答", en: "The subagent answers" },
  missedWord: { zh: "摘要里没有的东西", en: "What the summary left out" },
  colParent: { zh: "父 agent 看到", en: "Parent sees" },
  colActual: { zh: "实际", en: "Actually" },
};
