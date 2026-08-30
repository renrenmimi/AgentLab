// 第 9 站「怎么知道变好了」：十个存好的任务，一个通过数。
// 关键在于每个任务都配一句「怎么算通过」——判据必须是能判的，
// 否则跑十遍也只是十次「感觉」。

import type { L } from "@/lib/i18n";
import type { Block, LessonMeta } from "@/lib/lesson";

export type Version = "v1" | "v2";

export type Task = {
  id: number;
  task: L;
  check: L; // 怎么算通过：一句能当场判定的话
  v1: boolean;
  v2: boolean;
  // v2 的结果为什么变了。只有翻转的行需要解释。
  why?: L;
};

export const versions: Record<Version, { name: L; prompt: L }> = {
  v1: {
    name: { zh: "v1（原来的）", en: "v1 (the one you had)" },
    prompt: {
      zh: "你是一个代码助手，可以用工具查看这个项目。回答要简洁。",
      en: "You are a coding assistant with tools for looking at this project. Answer concisely.",
    },
  },
  v2: {
    name: { zh: "v2（加了两句）", en: "v2 (two sentences added)" },
    prompt: {
      zh:
        "你是一个代码助手，可以用工具查看这个项目。回答要简洁。" +
        "每一个结论都必须给出具体的文件和行号。" +
        "如果工具结果被截断了，必须说明。",
      en:
        "You are a coding assistant with tools for looking at this project. Answer concisely. " +
        "Every claim must cite a specific file and line number. " +
        "If a tool result was truncated, say so.",
    },
  },
};

export const tasks: Task[] = [
  {
    id: 1,
    task: { zh: "这个项目用了哪些依赖？", en: "What dependencies does this project use?" },
    check: {
      zh: "答案里出现 next、react、react-dom 三个，且没有多列不存在的包",
      en: "Names next, react and react-dom, and invents nothing that is not there",
    },
    v1: true,
    v2: true,
  },
  {
    id: 2,
    task: { zh: "谁调用了 sendEmail？", en: "Who calls sendEmail?" },
    check: {
      zh: "四处调用点全部列出",
      en: "Lists all four call sites",
    },
    v1: true,
    v2: false,
    why: {
      zh:
        "v2 要求每个结论都带文件和行号，模型于是只报了它能精确定位的那一处，" +
        "另外三处因为在同一个文件的不同分支里没有一起给出。要求更严，答案反而更少了。",
      en:
        "v2 demands a file and a line for every claim, so the model reported only the one it could pin down " +
        "exactly and left out the other three, which sit in different branches of the same file. A stricter " +
        "requirement produced a less complete answer.",
    },
  },
  {
    id: 3,
    task: { zh: "还剩多少个 TODO？", en: "How many TODOs are left?" },
    check: { zh: "数字正确（2 个）", en: "The count is right (2)" },
    v1: true,
    v2: true,
  },
  {
    id: 4,
    task: { zh: "0042.sql 这次迁移做了什么？", en: "What did migration 0042.sql do?" },
    check: {
      zh: "指出 total 从 DECIMAL 改成了 FLOAT，并说明在哪一行",
      en: "Says total changed from DECIMAL to FLOAT, and where",
    },
    v1: false,
    v2: true,
    why: {
      zh: "这正是你想修的那一个：v1 只说「改了字段类型」，v2 因为被要求给行号，把改动本身也说清楚了。",
      en: "This is the one you set out to fix: v1 said only that a column type changed, and v2, required to give a line, spelled out the change itself.",
    },
  },
  {
    id: 5,
    task: { zh: "哪些导出函数没有测试？", en: "Which exported functions have no tests?" },
    check: { zh: "列出的 6 个全对，且没有漏", en: "All six are right, with none missing" },
    v1: false,
    v2: false,
  },
  {
    id: 6,
    task: { zh: "把 README 的安装说明改成 pnpm", en: "Change the README install steps to pnpm" },
    check: {
      zh: "说明自己不能写文件，并给出 diff（工具集是只读的）",
      en: "Says it cannot write files and outputs a diff (the toolset is read-only)",
    },
    v1: false,
    v2: false,
  },
  {
    id: 7,
    task: { zh: "server.log 里那次崩溃是怎么回事？", en: "What was the crash in server.log?" },
    check: {
      zh: "指出 OOM，并说明日志被截断了、只看了尾部",
      en: "Identifies the OOM and states that the log was truncated and only the tail was read",
    },
    v1: false,
    v2: true,
    why: {
      zh: "v2 里那句「被截断了必须说明」直接生效。v1 答对了原因，但没提自己只看了一部分。",
      en: "The second sentence added in v2 does this directly. v1 got the cause right but never mentioned that it had seen only part of the file.",
    },
  },
  {
    id: 8,
    task: { zh: "这个项目用的是什么框架？", en: "What framework does this project use?" },
    check: { zh: "答 Next.js，并指出依据", en: "Answers Next.js and says how it knows" },
    v1: true,
    v2: true,
  },
  {
    id: 9,
    task: { zh: "哪些地方还在用 v1 接口？", en: "Where is the v1 API still used?" },
    check: {
      zh: "指出自己代码里的 3 处，并说明 vendor/ 下的不算",
      en: "Names the 3 in our own code and excludes the ones under vendor/",
    },
    v1: true,
    v2: false,
    why: {
      zh:
        "和第 2 行同一个原因：匹配有五千多条，v2 要给每处行号，模型于是只列了前几条就停了，" +
        "「vendor/ 下的不算」这个更有用的判断反而没做。",
      en:
        "The same cause as row 2: there are five thousand matches, v2 wants a line number for each, so the " +
        "model listed the first few and stopped — and never made the more useful judgement that the ones " +
        "under vendor/ do not count.",
    },
  },
  {
    id: 10,
    task: { zh: "src/utils.ts 里的 formatDate 是怎么写的？", en: "How is formatDate written in src/utils.ts?" },
    check: {
      zh: "说清楚这个文件不存在，而不是编一段实现出来",
      en: "Says the file does not exist rather than inventing an implementation",
    },
    v1: false,
    v2: true,
    why: {
      zh: "要求给出文件和行号，等于要求模型先确认文件在不在。v1 顺着问题编了一个看起来很像的实现。",
      en: "Requiring a file and a line forces the model to establish that the file exists. v1 went along with the question and invented a plausible implementation.",
    },
  },
];

export function score(v: Version): number {
  return tasks.filter((t) => (v === "v1" ? t.v1 : t.v2)).length;
}

export function fixed(): Task[] {
  return tasks.filter((t) => !t.v1 && t.v2);
}

export function broke(): Task[] {
  return tasks.filter((t) => t.v1 && !t.v2);
}

// ---------------------------------------------------------------- 文案

export const meta: LessonMeta = {
  title: { zh: "第 9 站 · 怎么知道它变好了", en: "Stop 9 · How you know it got better" },
  subtitle: {
    zh: "「感觉好多了」不是一个答案。十个存好的任务和一个通过数就是——这一站把最小可用的那一版做出来。",
    en: "\"It seems better\" is not an answer. Ten saved tasks and a pass count is. This stop builds the smallest version that works.",
  },
  takeaway: {
    zh:
      "改提示词不是局部动作，是全局动作：你为一个任务加的一句话，会作用在所有任务上。" +
      "所以「改完之后试一下那个任务」永远不够——你要试的是全部十个，" +
      "而十个和一个的差别，就是「知道」和「以为」的差别。",
    en:
      "Changing a prompt is not a local edit, it is a global one: a sentence added for one task applies to " +
      "every task. So trying the task you were annoyed by is never enough — you have to run all ten. The " +
      "difference between ten and one is the difference between knowing and assuming.",
  },
};

export const blocks: Block[] = [
  {
    title: { zh: "「感觉变好了」出了什么问题", en: "What is wrong with \"it seems better\"" },
    paras: [
      {
        zh:
          "事情通常是这样发生的：某个任务的回答让你不满意，你在 system 提示词里加了一句话，" +
          "再跑那个任务，好了，于是这个改动就留下了。" +
          "整个过程唯一的问题是：你改的是全局，你验的是局部。" +
          "那句话会出现在此后每一个任务的每一轮里，而你只看了其中一个。",
        en:
          "It usually goes like this: one task gives an answer you do not like, you add a sentence to the " +
          "system prompt, you run that task again, it is better, and the change stays. The only problem with " +
          "the procedure is that the change is global and the check was local. That sentence now appears in " +
          "every round of every task, and you looked at one of them.",
      },
      {
        zh:
          "更麻烦的是，退步通常不长得像退步。它不会报错，也不会变成一句明显的胡话，" +
          "它长得像「这次回答短了一点」或者「这次只列了一条」——" +
          "而你正因为刚改完提示词，很容易把它读成「变简洁了」。",
        en:
          "Worse, a regression rarely looks like one. It does not raise an error and it is not obvious " +
          "nonsense; it looks like a slightly shorter answer, or one item where there used to be four — and " +
          "having just changed the prompt yourself, you are primed to read that as concision.",
      },
    ],
  },
  {
    title: { zh: "最小可用的那一版", en: "The smallest version that works" },
    paras: [
      {
        zh:
          "不需要框架，不需要打分模型，不需要统计显著性。需要的是两样东西：" +
          "一份存好的任务清单，和每个任务一句**能当场判定**的通过标准。" +
          "「答得好」不是标准，「答案里出现 next、react、react-dom 三个且没有编造」是标准——" +
          "区别在于第二种，换一个人来判也会得到同样的结果。",
        en:
          "No framework, no grading model, no statistical significance. Two things: a saved list of tasks, and " +
          "for each one a pass condition you can **decide on the spot**. \"Answers well\" is not a condition. " +
          "\"Names next, react and react-dom and invents nothing\" is — the difference being that a second " +
          "person applying the second one lands in the same place.",
      },
      {
        zh:
          "十个任务就够开始了，手工判也完全可以。挑任务时留心两件事：" +
          "一是把你**已经修好过**的问题留在里面，它们是防退步的那一半；" +
          "二是放两三个「应该拒绝」的任务——问一个不存在的文件、要求一个工具集做不到的事——" +
          "因为模型出错时最常见的形态不是答不上来，是答得很顺。",
        en:
          "Ten tasks is enough to start, and judging them by hand is fine. Two things to watch when choosing " +
          "them: keep the problems you have **already fixed** in the list, because they are the half that " +
          "catches regressions; and include two or three tasks that should be refused — a file that does not " +
          "exist, something the toolset cannot do — because the common failure is not silence, it is " +
          "fluency.",
      },
    ],
    faq: {
      q: {
        zh: "同一个任务跑两次结果不一样，怎么办？",
        en: "What if the same task gives different results on different runs?",
      },
      a: {
        zh:
          "会的，而且这本身就是要知道的信息。做法是同一个任务跑三次，记「三次里过了几次」，" +
          "而不是记「过了 / 没过」。一个原来三次全过、改完之后三次过两次的任务，" +
          "在只跑一次的记法里可能完全看不出来。稳定性也是质量的一部分。",
        en:
          "It will, and that is itself worth knowing. Run each task three times and record how many of the " +
          "three passed, rather than pass or fail. A task that used to pass three times out of three and now " +
          "passes two would be invisible if you ran it once. Consistency is part of quality.",
      },
    },
  },
  {
    title: { zh: "跑一遍看看", en: "Run it and see" },
    paras: [
      {
        zh:
          "上面那张表就是一份十条的清单。切到 v2——那两句话是为了修第 4 行加的，" +
          "而它确实修好了第 4 行，还顺带修好了第 7 行和第 10 行。" +
          "如果只看这三行，这是一次很成功的改动。",
        en:
          "The table above is a ten-item list. Switch to v2 — those two sentences were added to fix row 4, and " +
          "they do fix row 4, and rows 7 and 10 as well. Looking only at those three, it is a clear success.",
      },
      {
        zh:
          "但第 2 行和第 9 行退步了，原因都是同一个：" +
          "「每个结论都要给出文件和行号」这个要求，让模型不再愿意给出那些它无法逐条定位的结论，" +
          "于是完整的清单变成了不完整的清单。净结果是 5 → 6，一次改动只赚了一分。" +
          "这一分该不该要，是可以讨论的；但没有这张表，你连有这个讨论的机会都没有——" +
          "你会以为自己赚了三分。",
        en:
          "But rows 2 and 9 got worse, both for the same reason: the requirement to cite a file and a line for " +
          "every claim made the model unwilling to state conclusions it could not pin down item by item, and " +
          "a complete list became an incomplete one. The net result is 5 to 6: one point for the change. " +
          "Whether that point is worth it is a fair discussion to have. Without this table you do not get to " +
          "have it — you believe you gained three.",
      },
    ],
  },
];

export const bench = {
  title: { zh: "十个任务，两个版本", en: "Ten tasks, two versions" },
  note: { zh: "通过标准写在每一行里", en: "the pass condition is on every row" },
  chooseLabel: { zh: "选一个提示词版本", en: "Choose a prompt version" },
  promptWord: { zh: "system 提示词", en: "system prompt" },
  taskCol: { zh: "任务", en: "Task" },
  checkCol: { zh: "怎么算通过", en: "Pass condition" },
  resultCol: { zh: "结果", en: "Result" },
  pass: { zh: "通过", en: "pass" },
  fail: { zh: "不通过", en: "fail" },
  fixedTag: { zh: "修好了", en: "fixed" },
  brokeTag: { zh: "弄坏了", en: "broken" },
  scoreWord: { zh: "通过", en: "Passing" },
  deltaWord: { zh: "相比 v1", en: "against v1" },
  fixedWord: { zh: "修好", en: "fixed" },
  brokeWord: { zh: "弄坏", en: "broken" },
  whyWord: { zh: "为什么变了", en: "why it changed" },
};
