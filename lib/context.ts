// 第 5 站「装不下的时候」：一段固定的对话 + 三种处理办法。
// 三种办法都是纯函数，页面和 verify.mjs 用同一份。

import type { L } from "@/lib/i18n";
import type { Block, LessonMeta } from "@/lib/lesson";

export type Msg = {
  id: number;
  role: "system" | "user" | "assistant";
  label: L;
  detail: L;
  tokens: number;
  // 这条消息是不是「任务本身」。截断把它丢掉时，后果和丢别的不一样。
  isTask?: boolean;
};

// 一段刻意缩小到能一眼看完的对话：真实窗口是二十万，这里用一千。
// 比例是一样的，算术是能心算的。
export const LIMIT = 1000;

export const conversation: Msg[] = [
  {
    id: 0,
    role: "system",
    label: { zh: "system 提示词", en: "system prompt" },
    detail: {
      zh: "你是一个数据库维护助手，可以读文件、跑查询。",
      en: "You are a database maintenance assistant; you can read files and run queries.",
    },
    tokens: 120,
  },
  {
    id: 1,
    role: "user",
    label: { zh: "任务", en: "the task" },
    detail: {
      zh: "上周那次迁移之后订单表的统计对不上，帮我找出原因。",
      en: "The order totals have been wrong since last week's migration. Find out why.",
    },
    tokens: 40,
    isTask: true,
  },
  {
    id: 2,
    role: "assistant",
    label: { zh: "我先看配置", en: "let me read the config" },
    detail: { zh: "tool_use: read_file(\"config.json\")", en: 'tool_use: read_file("config.json")' },
    tokens: 30,
  },
  {
    id: 3,
    role: "user",
    label: { zh: "tool_result：config.json", en: "tool_result: config.json" },
    detail: {
      zh: "数据库连接、时区设置 UTC+0、小数位数 2。",
      en: "Connection settings, timezone UTC+0, decimal places 2.",
    },
    tokens: 180,
  },
  {
    id: 4,
    role: "assistant",
    label: { zh: "再看迁移脚本", en: "now the migration" },
    detail: {
      zh: "tool_use: read_file(\"migrations/0042.sql\")",
      en: 'tool_use: read_file("migrations/0042.sql")',
    },
    tokens: 30,
  },
  {
    id: 5,
    role: "user",
    label: { zh: "tool_result：0042.sql", en: "tool_result: 0042.sql" },
    detail: {
      zh: "把 total 从 DECIMAL(10,2) 改成了 FLOAT。",
      en: "Changed total from DECIMAL(10,2) to FLOAT.",
    },
    tokens: 320,
  },
  {
    id: 6,
    role: "assistant",
    label: { zh: "再看错误日志", en: "and the error log" },
    detail: { zh: "tool_use: read_file(\"logs/orders.log\")", en: 'tool_use: read_file("logs/orders.log")' },
    tokens: 30,
  },
  {
    id: 7,
    role: "user",
    label: { zh: "tool_result：orders.log", en: "tool_result: orders.log" },
    detail: {
      zh: "大量 0.1 + 0.2 = 0.30000000000000004 这类尾数。",
      en: "Many totals like 0.30000000000000004 instead of 0.30.",
    },
    tokens: 400,
  },
  {
    id: 8,
    role: "assistant",
    label: { zh: "我大概明白了", en: "I think I have it" },
    detail: {
      zh: "正要给出结论，这一轮的请求得先发出去。",
      en: "About to conclude — but this round has to be sent first.",
    },
    tokens: 60,
  },
];

export type Strategy = "refuse" | "truncate" | "summarise";

export type Outcome = {
  kept: Msg[];
  dropped: Msg[];
  // 摘要办法会新造一条消息，它不在原对话里
  synthetic?: { tokens: number; label: L; detail: L };
  total: number;
  fits: boolean;
  lostTask: boolean;
};

export const SUMMARY_TOKENS = 90;

export function totalTokens(msgs: Msg[]): number {
  return msgs.reduce((n, m) => n + m.tokens, 0);
}

// 三种办法都会丢东西。区别在于丢的是什么，以及是谁决定的。
export function apply(strategy: Strategy, msgs: Msg[], limit: number): Outcome {
  if (strategy === "refuse") {
    return {
      kept: [],
      dropped: msgs.slice(),
      total: 0,
      fits: true,
      lostTask: true,
    };
  }

  if (strategy === "truncate") {
    // system 必须留着，从最老的对话消息开始丢，丢到装得下为止。
    const head = msgs.filter((m) => m.role === "system");
    const rest = msgs.filter((m) => m.role !== "system");
    const kept = rest.slice();
    const dropped: Msg[] = [];
    while (totalTokens(head) + totalTokens(kept) > limit && kept.length > 0) {
      dropped.push(kept.shift()!);
    }
    const all = head.concat(kept);
    return {
      kept: all,
      dropped,
      total: totalTokens(all),
      fits: totalTokens(all) <= limit,
      lostTask: dropped.some((m) => m.isTask),
    };
  }

  // 摘要：把早期那一段压成一条短消息，保留最近的原文。
  const head = msgs.filter((m) => m.role === "system");
  const rest = msgs.filter((m) => m.role !== "system");
  const tail = rest.slice(-2); // 最近两条留原文
  const folded = rest.slice(0, -2);
  const summary = {
    tokens: SUMMARY_TOKENS,
    label: { zh: "摘要（新造的一条消息）", en: "summary (a message that did not exist)" },
    detail: {
      zh: "此前进展：任务是查订单统计对不上的原因；已读 config.json（时区 UTC+0）与 0042.sql（total 改成了 FLOAT）。",
      en: "So far: the task is to find why order totals are wrong; config.json read (timezone UTC+0) and 0042.sql read (total changed to FLOAT).",
    },
  };
  const total = totalTokens(head) + summary.tokens + totalTokens(tail);
  return {
    kept: head.concat(tail),
    dropped: folded,
    synthetic: summary,
    total,
    fits: total <= limit,
    // 任务本身没有原样留下，但被写进了摘要里
    lostTask: false,
  };
}

// ---------------------------------------------------------------- 文案

export const meta: LessonMeta = {
  title: { zh: "第 5 站 · 装不下的时候", en: "Stop 5 · When it will not fit" },
  subtitle: {
    zh: "上下文窗口是一个硬上限。到顶之后只有三条路，三条都要丢东西。",
    en: "The context window is a hard ceiling. There are three ways past it, and all three lose something.",
  },
  takeaway: {
    zh:
      "上下文满了不是一个可以「更聪明地解决」的问题，它是一个必须由你的代码回答的问题：丢掉什么。" +
      "拒绝、截断、摘要，三条路各丢一样东西；不选，就等于选了最糟的那条——请求直接被退回。",
    en:
      "A full context is not a problem intelligence can solve. It is a question your code has to answer: what " +
      "gets thrown away. Refuse, truncate, summarise — each loses something different. Declining to choose is " +
      "choosing the worst one, where the request is simply refused.",
  },
};

export const blocks: Block[] = [
  {
    title: { zh: "先看 token 到底是什么", en: "First, what a token actually is" },
    paras: [
      {
        zh:
          "模型不是按字符也不是按单词计量文本的，而是按 [[token:token]]。" +
          "把一句话切成模型实际看到的样子，大概是这样：" +
          "「找出 / 订单 / 统计 / 对不 / 上 / 的 / 原因」——常见词是一整块，生僻词会被拆开，" +
          "标点和空格也各占位置。英文里一个 token 大约四个字符，中文一个字往往就要一到两个 token。",
        en:
          "A model does not measure text in characters or in words but in [[token:token]]s. Split a sentence " +
          "the way a model actually sees it and you get something like: \"Find / out / why / the / order / " +
          "tot / als / are / wrong\" — common words are one piece, unusual ones get broken up, and punctuation " +
          "and spaces take up room too. In English a token is roughly four characters; in Chinese a single " +
          "character often costs one or two on its own.",
      },
      {
        zh:
          "为什么要在意这个：因为模型一次能读进去的 token 数是有上限的，这个上限叫上下文窗口。" +
          "它不是「读起来会有点慢」，而是一道墙——超过一个 token 请求都不会被受理。" +
          "第 2 站那次 40 MB 日志的失败，就是撞在这道墙上。",
        en:
          "Why it matters: there is a ceiling on how many tokens a model can read in one request, and that " +
          "ceiling is the context window. It is not a soft limit that makes things slow. It is a wall — one " +
          "token over and the request is not accepted at all. The 40 MB log that failed at stop 2 hit this " +
          "wall.",
      },
    ],
    faq: {
      q: {
        zh: "窗口那么大，真的会用完吗？",
        en: "The windows are large. Does anyone actually run out?",
      },
      a: {
        zh:
          "日常聊天几乎不会。跑工具的 agent 很容易：一个目录列表、几个文件、一份测试输出、一段栈追踪，" +
          "十几轮就能到几万 token；再加上有人把一份 PDF 或者整个 schema 贴进第一条消息，几轮就见底。" +
          "而且要记住第 4 站那条：窗口没满不代表便宜——你在窗口里塞的每一样东西，之后每一轮都在为它付钱。",
        en:
          "In ordinary chat, almost never. In a tool-using agent, easily: a directory listing, a few files, a " +
          "test run, a stack trace, and a dozen rounds puts you in the tens of thousands. Add someone pasting " +
          "a PDF or a whole schema into the first message and it goes fast. And remember stop 4: staying under " +
          "the ceiling is not the same as being cheap. Everything you keep in the window is paid for again " +
          "every round.",
      },
    },
  },
  {
    title: { zh: "三条路，都要丢东西", en: "Three ways past it, all of them lossy" },
    paras: [
      {
        zh:
          "上面这段对话已经跑了四轮，加起来 1,210 个 token，而这个例子里的窗口是 1,000。" +
          "下一轮发不出去了。此刻能做的只有三件事，用上面的按钮各试一次：",
        en:
          "The conversation above has run four rounds and comes to 1,210 tokens, against a window of 1,000 in " +
          "this example. The next round cannot be sent. There are exactly three things to do about it; try " +
          "each with the buttons above:",
      },
      {
        zh:
          "**拒绝**最诚实，也最没用：告诉用户放不下了，然后什么都不做。" +
          "在很多产品里这其实是对的——与其给一个基于残缺历史的答案，不如说清楚。" +
          "**截断**最常见，也最容易出隐蔽的错：从最老的消息开始丢。" +
          "试一下就会看到，被丢掉的第一条正是任务本身，模型接下来在回答一个它已经不知道的问题。" +
          "**摘要**最贵也最有用：花一次额外的模型调用，把早期那一段压成一小段文字放回去。" +
          "它保住了「要做什么」，代价是细节不可逆地没了——你没法从摘要里再读出那句 DECIMAL 改 FLOAT。",
        en:
          "**Refusing** is the most honest and the least useful: tell the user it does not fit and stop. In " +
          "many products that is the right call — better than an answer built on a mutilated history. " +
          "**Truncating** is the most common and the easiest way to fail quietly: drop from the oldest end. " +
          "Try it and watch what goes first — the task itself, after which the model is answering a question " +
          "it can no longer read. **Summarising** costs the most and helps the most: spend an extra model call " +
          "folding the early stretch into a short passage and put that back. It keeps what the job was, at the " +
          "price of detail that is gone for good — you cannot recover \"DECIMAL became FLOAT\" from a summary " +
          "that no longer mentions it.",
      },
    ],
    faq: {
      q: {
        zh: "为什么不能只丢中间那几条大的？",
        en: "Why not just drop the big ones in the middle?",
      },
      a: {
        zh:
          "可以，而且实践中常这么做，但要小心数组里的消息不是彼此独立的。" +
          "一条 assistant 的 tool_use 和紧跟它的那条 tool_result 是一对：只丢掉结果、留下请求，" +
          "模型会看到自己提了个要求却没有下文；反过来只留结果，就出现了一条没人要过的答案。" +
          "所以丢消息要成对地丢，而且丢完之后那段历史读起来仍然要是连贯的。",
        en:
          "You can, and in practice people do, but be careful: messages in the array are not independent. An " +
          "assistant tool_use and the tool_result after it are a pair. Drop the result and keep the request, " +
          "and the model sees itself asking for something that never came back. Keep the result and drop the " +
          "request, and an answer appears that nobody asked for. Drop them in pairs, and make sure what is " +
          "left still reads as a coherent history.",
      },
    },
  },
];

export const bench = {
  title: { zh: "同一段对话，三种处理", en: "One conversation, three treatments" },
  note: { zh: "窗口 1,000 token", en: "window of 1,000 tokens" },
  chooseLabel: { zh: "选一种处理办法", en: "Choose a treatment" },
  before: { zh: "处理前", en: "Before" },
  after: { zh: "处理后", en: "After" },
  kept: { zh: "留下", en: "kept" },
  droppedWord: { zh: "丢掉", en: "dropped" },
  totalWord: { zh: "合计", en: "total" },
  overBy: { zh: "超出", en: "over by" },
  fitsNow: { zh: "现在装得下", en: "fits now" },
  lostTaskWarn: {
    zh: "注意：任务本身被丢掉了。模型接下来要回答的问题，它已经读不到了。",
    en: "Note: the task itself was dropped. The model can no longer read the question it is answering.",
  },
  refuseNote: {
    zh: "什么都不发。用户得到一句「这段对话太长了」，而不是一个不可靠的答案。",
    en: "Nothing is sent. The user gets \"this conversation is too long\" instead of an unreliable answer.",
  },
  summaryNote: {
    zh: "多花一次模型调用换来的：任务留住了，最近两条留了原文，中间四条被压成一句话。",
    en: "Bought with one extra model call: the task survives, the last two messages stay verbatim, and the four in between become one sentence.",
  },
  options: {
    refuse: { zh: "拒绝", en: "Refuse" },
    refuseHint: { zh: "不发，告诉用户", en: "send nothing, tell the user" },
    truncate: { zh: "截断", en: "Truncate" },
    truncateHint: { zh: "从最老的开始丢", en: "drop from the oldest end" },
    summarise: { zh: "摘要", en: "Summarise" },
    summariseHint: { zh: "把早期压成一段", en: "fold the early part into a passage" },
  },
};
