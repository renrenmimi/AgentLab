// 第 4 站「它为什么这么贵」：一个可以算的成本模型 + 文案。
//
// 模型本身是纯函数，页面和 verify.mjs 用的是同一份。
// 这里所有价格都是这一页自己设的示例价，不是任何厂商的实时价目表；
// 结论只依赖「输入按量计费、缓存命中便宜一个数量级」这两条，不依赖具体数字。

import type { L } from "@/lib/i18n";
import type { Block, LessonMeta } from "@/lib/lesson";

export type Assumptions = {
  prefix: number; // system 提示词 + 工具说明书，每轮都在，且位置固定，可以被缓存
  task: number; // 第一条 user 消息
  growth: number; // 每跑完一轮，数组增加多少（assistant 回复 + tool_result）
  output: number; // 每轮模型生成多少
  priceIn: number; // 每百万输入 token 的示例价（美元）
  priceOut: number; // 每百万输出 token 的示例价
  cacheRead: number; // 命中缓存的那部分，按输入价的几折算
  cacheWrite: number; // 写入缓存的那部分，按输入价的几倍算
};

export const ASSUMPTIONS: Assumptions = {
  prefix: 1200,
  task: 60,
  growth: 600,
  output: 200,
  priceIn: 3,
  priceOut: 15,
  cacheRead: 0.1,
  cacheWrite: 1.25,
};

export const MAX_ROUNDS = 40;

// 第 i 轮（从 1 开始）发出去的 prompt 有多长。
// 注意它跟 i 是线性的——真正的二次增长来自「把这条线性的东西累加 i 次」。
export function promptTokens(a: Assumptions, i: number, extra = 0): number {
  return a.prefix + a.task + extra + (i - 1) * a.growth;
}

export type RunCost = {
  perRound: number[]; // 每一轮花多少美元
  cumulative: number[]; // 累计花多少美元
  inputTokens: number; // 累计发出去多少输入 token
  total: number; // 总美元
};

// cached = false：每一轮把整个数组当新内容发一遍。
// cached = true：上一轮已经发过的那一段命中缓存，只有本轮新增的部分按原价算
//                （并且要为写进缓存多付一点）。
export function runCost(
  a: Assumptions,
  rounds: number,
  opts: { cached: boolean; extra?: number },
): RunCost {
  const extra = opts.extra ?? 0;
  const perRound: number[] = [];
  const cumulative: number[] = [];
  let running = 0;
  let inputTokens = 0;

  for (let i = 1; i <= rounds; i++) {
    const prompt = promptTokens(a, i, extra);
    inputTokens += prompt;

    let inDollars: number;
    if (!opts.cached) {
      inDollars = (prompt * a.priceIn) / 1e6;
    } else if (i === 1) {
      // 第一轮没有可命中的东西，整段都要写进缓存
      inDollars = (prompt * a.priceIn * a.cacheWrite) / 1e6;
    } else {
      const hit = promptTokens(a, i - 1, extra); // 上一轮发过的那一段
      const fresh = prompt - hit; // 这一轮新增的那一段
      inDollars =
        (hit * a.priceIn * a.cacheRead + fresh * a.priceIn * a.cacheWrite) / 1e6;
    }

    const outDollars = (a.output * a.priceOut) / 1e6;
    const step = inDollars + outDollars;
    perRound.push(step);
    running += step;
    cumulative.push(running);
  }

  return { perRound, cumulative, inputTokens, total: running };
}

// 「如果每一轮都跟第 1 轮一样贵」——用来在图上画一条线性参照线，
// 好让二次增长偏离直线这件事看得见。
export function linearReference(a: Assumptions, rounds: number, extra = 0): number[] {
  const first = runCost(a, 1, { cached: false, extra }).total;
  return Array.from({ length: rounds }, (_, i) => first * (i + 1));
}

// ---------------------------------------------------------------- 文案

export const meta: LessonMeta = {
  title: {
    zh: "第 4 站 · 它为什么这么贵",
    en: "Stop 4 · Why it costs what it costs",
  },
  subtitle: {
    zh: "一次运行的花费不是随轮数线性长的，是随轮数的平方长的。这一站把那条曲线画出来。",
    en: "The cost of a run does not grow with the number of rounds. It grows with the square of it. This stop draws the curve.",
  },
  takeaway: {
    zh:
      "你在第 1 轮放进[[array:数组]]里的东西，会在之后的每一轮里被重新买一次。" +
      "所以要控制的不是「一共跑了多少轮」，而是「每一轮拖着多少东西一起跑」。",
    en:
      "Whatever you put into the [[array:array]] on round 1, you buy again on every round after it. " +
      "The thing to control is not how many rounds a run takes, but how much each round has to carry.",
  },
};

export const blocks: Block[] = [
  {
    title: { zh: "先回到那个数组", en: "Back to the array" },
    paras: [
      {
        zh:
          "第 2 站已经看过这件事，但那时它只是一个现象：[[api:API]] 是[[stateless:无状态]]的，" +
          "所以每一轮都要把整个[[array:数组]]从头发一遍。现在把它当成一道算术题。" +
          "第 1 轮你发出去的是 system 提示词、工具说明书、你的任务。" +
          "第 2 轮发的是这些，加上模型的回复，加上工具结果。第 3 轮是这些再加一轮的量。",
        en:
          "Stop 2 showed this as a fact about how the API works: it is [[stateless:stateless]], so every " +
          "round resends the whole [[array:array]] from the beginning. Now treat it as arithmetic. Round 1 " +
          "sends the system prompt, the tool list and your task. Round 2 sends all of that plus the model's " +
          "reply plus the tool result. Round 3 sends all of that plus another round's worth.",
      },
      {
        zh:
          "重点在第二步：你付的不是最后一轮的钱，是每一轮的总和。" +
          "一个每轮多出六百个 [[token:token]] 的运行，跑到第 40 轮时，那一轮要发大约两万五千个 token；" +
          "而从第 1 轮累加到第 40 轮，一共发出去的接近五十万个。" +
          "线性增长的是「这一轮多大」，二次增长的是「一共发了多少」。账单看的是后者。",
        en:
          "The second step is the one that matters: you do not pay for the last round, you pay for the sum of " +
          "all of them. In a run that adds six hundred [[token:token]]s per round, round 40 sends about " +
          "twenty-five thousand tokens — but rounds 1 through 40 together send close to half a million. What " +
          "grows linearly is the size of one round. What grows quadratically is the total. The bill is the " +
          "total.",
      },
    ],
    faq: {
      q: { zh: "为什么是平方？", en: "Why the square?" },
      a: {
        zh:
          "把每一轮的长度排成一列：a、a+g、a+2g、……、a+(n−1)g。这是等差数列，求和等于 n·a + g·n(n−1)/2。" +
          "第二项里有 n²，n 一大它就占主导。换成人话：第 10 轮时你已经把最早那条消息发了 10 遍，" +
          "第 40 轮时发了 40 遍。轮数在涨，早期内容被重复购买的次数也在涨，两个一起涨就是平方。",
        en:
          "Line up the size of each round: a, a+g, a+2g, …, a+(n−1)g. That is an arithmetic series, and it " +
          "sums to n·a + g·n(n−1)/2. The second term contains n², which dominates once n is large. In plain " +
          "words: by round 10 you have sent the first message ten times, and by round 40 you have sent it " +
          "forty times. The number of rounds is growing and so is the number of times the early content is " +
          "re-bought. Two things growing together multiply.",
      },
    },
  },
  {
    title: { zh: "缓存把斜率压下来，但不改变形状", en: "Caching flattens the slope, it does not change the shape" },
    paras: [
      {
        zh:
          "每一轮发出去的内容，绝大部分和上一轮一模一样——只有末尾多了一小段。" +
          "提示词缓存（prompt caching）就是针对这件事：如果这一轮的开头和上一轮完全一致，" +
          "那一段可以按远低于原价的价钱重新读一遍，只有新增的部分按原价算。" +
          "把上面的开关打开，看第二条曲线。",
        en:
          "Almost everything sent on a round is identical to the previous round; only a short piece at the end " +
          "is new. Prompt caching exists for exactly this: if a round begins with the same content as the last " +
          "one, that prefix can be re-read at a fraction of the normal price, and only the new part is charged " +
          "in full. Turn the switch on above and watch the second curve.",
      },
      {
        zh:
          "值得看清楚的是：缓存那条线依然是弯的。被重复读的那一段按十分之一计价，" +
          "但它依然要按轮数付一次，所以曲线依然是二次的，只是系数小得多。" +
          "按这一页的假设跑四十轮，总价从 $1.68 降到 $0.36，大约四点六倍——" +
          "不是十倍，因为输出 token 和每轮新增的那一段仍然按原价算。" +
          "缓存是打折，不是免单：一个跑五百轮的 agent，加不加缓存都贵，加了只是没那么贵。",
        en:
          "Look carefully at the shape: the cached line still bends. The re-read prefix is billed at a tenth, " +
          "but it is still billed once per round, so the curve is still quadratic with a much smaller " +
          "coefficient. Under the assumptions on this page, forty rounds fall from $1.68 to $0.36 — about " +
          "four and a half times cheaper, not ten times, because output tokens and each round's new slice are " +
          "still charged in full. Caching is a discount, not an exemption. An agent that runs five hundred " +
          "rounds is expensive either way; with caching it is less expensive.",
      },
    ],
    faq: {
      q: {
        zh: "缓存是不是打开就一定划算？",
        en: "Is caching always worth switching on?",
      },
      a: {
        zh:
          "几乎总是，但有两个条件。第一，被缓存的必须是前缀：只要你在数组开头插一句话，" +
          "后面所有内容的位置全变了，缓存整段作废。所以随机的问候语、当前时间戳这类东西不要放在 system 里。" +
          "第二，写入缓存本身要多花一点钱，所以只跑一轮就结束的对话，开缓存反而贵约 14%。" +
          "把上面的轮数拉到 1，缓存那条线在上面；拉到 2，它就已经在下面了。",
        en:
          "Almost always, with two conditions. First, what is cached has to be a prefix: insert one sentence " +
          "at the start of the array and everything after it shifts, invalidating the whole cache. So a random " +
          "greeting or the current timestamp does not belong in the system prompt. Second, writing to the " +
          "cache costs a little extra, so a conversation that ends after a single round comes out about 14% " +
          "more expensive with caching on. Drag the round count to 1 and the cached line sits above the other " +
          "one; drag it to 2 and it is already below.",
      },
    },
  },
  {
    title: { zh: "早放进去的东西最贵", en: "What goes in early costs the most" },
    paras: [
      {
        zh:
          "把上面的第二个开关打开：在第一条消息里贴进一份两万 token 的文档——一份规范、一段日志、一个大 JSON。" +
          "它只被贴了一次，但它在数组的最前面，于是它出现在此后每一轮的请求里。" +
          "跑四十轮，你就为这一份文档付了四十遍钱：它自己只值六分钱，四十轮下来是 $2.40，" +
          "把整次运行从 $1.68 抬到 $4.08。而这四十遍里，可能有三十九遍它根本没被用到。",
        en:
          "Turn on the second switch above: paste a twenty-thousand-token document into the first message — a " +
          "specification, a log, a large JSON blob. It is pasted once, but it sits at the front of the array, " +
          "so it appears in every request from then on. Over forty rounds you pay for that document forty " +
          "times: six cents of tokens becomes $2.40, and the run goes from $1.68 to $4.08. In thirty-nine of " +
          "those forty it may not have been needed at all.",
      },
      {
        zh:
          "这条规律给出的做法很具体：把大块内容留在工具后面，等模型真的要用时再去取，而不是预先全塞进去。" +
          "「先把所有可能有用的资料都放进上下文，反正模型自己会挑」这个直觉，在按量计费的循环里是最贵的一种写法。",
        en:
          "The rule this gives you is concrete: keep bulk behind a tool and fetch it when the model actually " +
          "asks, rather than loading it up front. The instinct to put everything that might be relevant into " +
          "the context and let the model pick is, in a metered loop, the most expensive thing you can do.",
      },
    ],
  },
];

// 动手区的文案
export const bench = {
  title: { zh: "自己拖一下", en: "Drag it yourself" },
  note: { zh: "示例价，非实时价目表", en: "illustrative prices" },
  rounds: { zh: "跑多少轮", en: "Rounds" },
  cacheOn: { zh: "开启提示词缓存", en: "Prompt caching on" },
  docOn: { zh: "在第一条消息里贴一份 20,000 token 的文档", en: "Paste a 20,000-token document into the first message" },
  statTotal: { zh: "累计花费", en: "Total spent" },
  statLast: { zh: "最后一轮", en: "Last round alone" },
  statFirstRound: { zh: "第 1 轮", en: "Round 1 alone" },
  statTokens: { zh: "累计发出的输入 token", en: "Input tokens sent" },
  statRatio: { zh: "最后一轮是第 1 轮的", en: "Last round vs round 1" },
  chartTitle: { zh: "累计花费（美元）", en: "Cumulative spend (USD)" },
  axisRounds: { zh: "轮数", en: "rounds" },
  seriesPlain: { zh: "不用缓存", en: "no caching" },
  seriesCached: { zh: "用缓存", en: "with caching" },
  seriesLinear: { zh: "如果每轮都和第 1 轮一样贵", en: "if every round cost what round 1 cost" },
  assumptions: {
    zh: "假设：system + 工具说明书 1,200 token，任务 60 token，每轮新增 600 token，每轮生成 200 token；输入 $3／百万，输出 $15／百万；缓存命中按输入价一折，写入按 1.25 倍。",
    en: "Assumptions: 1,200 tokens of system prompt and tool list, a 60-token task, 600 tokens added per round, 200 tokens generated per round; $3 per million input tokens, $15 per million output; a cache hit is charged at one tenth of the input price and a cache write at 1.25×.",
  },
};
