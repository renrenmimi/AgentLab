// 第 4 站「为什么每次不一样」：采样与温度。
// 取样函数是纯函数，页面、verify.mjs 和自检用的是同一份。

import type { L } from "@/lib/i18n";
import type { Block, LessonMeta } from "@/lib/lesson";

export type Outcome = {
  id: string;
  // 模型这一轮打算做什么
  move: L;
  // 这条路走下去会怎样
  result: L;
  // 相对权重：模型「更想」说哪一句
  weight: number;
  kind: "good" | "slower" | "wrong";
};

// 同一个任务、同一个数组，模型可能走的四条路。
// 权重是这一页设的示例值，用来演示分布的形状，不是任何模型的实测数字。
export const outcomes: Outcome[] = [
  {
    id: "grep-root",
    move: { zh: 'run_command("grep -rn TODO .")', en: 'run_command("grep -rn TODO .")' },
    result: {
      zh: "一轮拿到全部 2 处，回答正确。",
      en: "Both occurrences in one round; the answer is right.",
    },
    weight: 60,
    kind: "good",
  },
  {
    id: "list-first",
    move: { zh: 'run_command("ls")', en: 'run_command("ls")' },
    result: {
      zh: "先看目录，再搜一次。多花一轮，答案一样对。",
      en: "Lists the directory first, then searches. One extra round, same correct answer.",
    },
    weight: 25,
    kind: "slower",
  },
  {
    id: "grep-src",
    move: { zh: 'run_command("grep -rn TODO src/")', en: 'run_command("grep -rn TODO src/")' },
    result: {
      zh: "猜了一个不存在的目录。接下来会发生什么，取决于工具怎么报错——第 2 站那次就是从这里开始的。",
      en: "Guesses a directory that does not exist. What happens next depends on how the tool reports it — this is where the run at stop 2 began.",
    },
    weight: 12,
    kind: "wrong",
  },
  {
    id: "answer-blind",
    move: { zh: "直接回答，不用工具", en: "answers directly, no tool" },
    result: {
      zh: "凭空说了一个数字。没有依据，而且听起来和正确答案一样自信。",
      en: "States a number with nothing behind it, and sounds exactly as confident as the correct answer.",
    },
    weight: 3,
    kind: "wrong",
  },
];

export const TEMPS = [0, 0.3, 0.7, 1] as const;
export type Temp = (typeof TEMPS)[number];

/**
 * 温度怎么改变分布：把权重取 1/T 次方再归一化。
 * T 越小，最大的那个越吃掉全部概率；T = 0 就是「永远选最大的那个」。
 */
export function distribution(temp: number): number[] {
  const max = Math.max(...outcomes.map((o) => o.weight));
  if (temp <= 0) {
    return outcomes.map((o) => (o.weight === max ? 1 : 0));
  }
  const raw = outcomes.map((o) => Math.pow(o.weight / max, 1 / temp));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((r) => r / sum);
}

/** 一个可复现的伪随机数：同一个 seed 永远给同一串数，好让页面和检查器对得上。 */
export function random(seed: number): number {
  let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function sample(temp: number, seed: number): Outcome {
  const p = distribution(temp);
  let r = random(seed);
  for (let i = 0; i < outcomes.length; i++) {
    r -= p[i];
    if (r <= 0) return outcomes[i];
  }
  return outcomes[outcomes.length - 1];
}

// ---------------------------------------------------------------- 文案

export const meta: LessonMeta = {
  title: { zh: "第 4 站 · 为什么每次不一样", en: "Stop 4 · Why the same question gives different answers" },
  subtitle: {
    zh: "同一个任务、同一个数组，跑两次可能走两条路。这一站解释为什么，以及它意味着什么。",
    en: "The same task and the same array can take two different paths. This stop explains why, and what follows from it.",
  },
  takeaway: {
    zh:
      "**agent 不是一个函数。** 同样的输入可以走出不同的路径，" +
      "所以「我试过，能用」不是证据，只是一次采样。" +
      "把温度调到 0 能减少变化，但减少不等于消除——环境本身每次也不一样。",
    en:
      "**An agent is not a function.** The same input can take a different path, so \"it worked when I tried " +
      "it\" is not evidence — it is one sample. Turning the temperature to zero reduces the variation without " +
      "removing it, because the environment differs between runs as well.",
  },
};

export const blocks: Block[] = [
  {
    title: { zh: "先按几下再说", en: "Press it a few times first" },
    paras: [
      {
        zh:
          "上面是同一个任务：数一下这个项目里还剩多少个 TODO。" +
          "[[array:数组]]完全一样，system 提示词完全一样，工具完全一样。" +
          "按几次「再跑一次」，看它每次决定做什么。",
        en:
          "Above is one task: count the TODO comments left in this project. The [[array:array]] is identical, " +
          "the system prompt is identical, the tools are identical. Press Run it again a few times and watch " +
          "what it decides to do.",
      },
      {
        zh:
          "大多数时候它会直接搜，偶尔先看一眼目录，偶尔猜一个不存在的路径，" +
          "很少的情况下干脆不查就报个数。这四条路里有两条能得到正确答案，" +
          "一条要多花一轮，还有一条会给出一个没有依据的数字——" +
          "而你没有改任何东西。",
        en:
          "Most of the time it searches straight away, sometimes it lists the directory first, sometimes it " +
          "guesses a path that does not exist, and occasionally it just states a number without looking. Two " +
          "of those four reach the right answer, one costs an extra round, and one produces a figure with " +
          "nothing behind it — and you changed nothing.",
      },
    ],
  },
  {
    title: { zh: "模型每一步都在掷一次骰子", en: "The model rolls a die at every step" },
    paras: [
      {
        zh:
          "模型不会「想出」下一个词。它算出的是一整张表：" +
          "在当前这段文字后面，每一个可能的 [[token:token]] 各有多大概率。" +
          "这张表出来之后，还需要有人从里面挑一个——挑的那一步叫采样（sampling），" +
          "它不是模型的一部分，是调用方的一段代码。",
        en:
          "A model does not think of the next word. What it computes is a table: for every possible " +
          "[[token:token]] that could come next, how likely it is. Something then has to pick one out of that " +
          "table. That step is called sampling, and it is not part of the model — it is a piece of code on the " +
          "calling side.",
      },
      {
        zh:
          "温度（temperature）是这一步的旋钮。它不改变模型算出来的表，只改变挑的方式：" +
          "温度低，概率最高的那个几乎总是被选中；温度高，排在后面的选项也有机会。" +
          "把上面的温度拉到 0 再按几次，你会看到它每次都走同一条路；" +
          "拉到 1，那条「不查就报数」的路也会偶尔出现。",
        en:
          "Temperature is the knob on that step. It does not change the table the model produced; it changes " +
          "how the pick is made. Low temperature and the most likely token is chosen nearly every time; high " +
          "temperature and the ones further down get a turn. Drag the temperature to 0 above and press again a " +
          "few times: the same path every time. Drag it to 1 and the path that answers without looking starts " +
          "to appear.",
      },
      {
        zh:
          "关键在于这个选择每生成一个 token 就发生一次。一次回复有几百个 token，" +
          "早期的一次不同选择会把后面全部内容带向另一个方向——" +
          "第三个 token 选了「src」而不是「.」，整次运行就变成了另一次运行。",
        en:
          "The part that matters is that this choice happens once per token generated. A reply is hundreds of " +
          "tokens long, and one different pick early on carries everything after it somewhere else: choose " +
          "\"src\" rather than \".\" as the third token and the whole run becomes a different run.",
      },
    ],
    faq: {
      q: {
        zh: "温度调到 0，是不是就完全确定了？",
        en: "Does temperature zero make it fully deterministic?",
      },
      a: {
        zh:
          "比想象的接近，但不是。第一，即使采样是确定的，服务端的浮点运算在不同批次、不同硬件上也不保证逐位一致，" +
          "两个概率咬得很紧时结果可能翻转。第二，也是更重要的一条：agent 的输入不只有你的提示词，" +
          "还有工具返回的东西——文件变了、命令慢了、网页改了，数组就不一样了，后面自然也不一样。" +
          "温度 0 消除的是采样这一处的随机，消除不了 agent 跑在一个会变的世界里这件事。",
        en:
          "Closer than you would think, and not quite. First, even with deterministic sampling the arithmetic " +
          "on the server is not guaranteed to be bit-identical across batches and hardware, and two " +
          "probabilities that sit very close together can swap. Second, and more importantly: an agent's input " +
          "is not only your prompt, it is also whatever the tools returned. A file changed, a command was " +
          "slower, a page was edited — the array is different, so the rest is different. Temperature zero " +
          "removes the randomness in one place; it does not remove the fact that the agent runs in a world " +
          "that moves.",
      },
    },
  },
  {
    title: { zh: "所以 agent 不是一个函数", en: "So an agent is not a function" },
    paras: [
      {
        zh:
          "这是这一站真正要留下的东西。函数的性质是同样的输入给同样的输出——" +
          "你测一次通过了，就知道它以后都通过。agent 没有这个性质。" +
          "同样的输入可能走出不同的路径，所以**「我试过，能用」不是证据，它是一次采样。**",
        en:
          "This is the thing to carry away. A function has the property that the same input gives the same " +
          "output: test it once and you know how it behaves. An agent does not have that property. The same " +
          "input can take a different path, which makes **\"it worked when I tried it\" not evidence but one " +
          "sample.**",
      },
      {
        zh:
          "这句话直接决定了后面几站的做法。为什么改完提示词要跑一整套任务而不是只看你刚才那个例子" +
          "（第 13 站），因为一次通过说明不了什么。为什么同一个任务要跑三次记「三次里过了几次」，" +
          "因为通过率才是可比的量，单次结果不是。为什么线上会出现你从没见过的行为，" +
          "因为你见过的是分布里概率最高的那几条路，而用户在替你采样剩下的那些。",
        en:
          "That sentence decides how the later stops work. Why a prompt change is checked against a whole set " +
          "of tasks rather than the one that annoyed you (stop 13): because one pass says very little. Why the " +
          "same task is run three times and recorded as how many of three passed: because a pass rate is a " +
          "comparable quantity and a single result is not. Why production shows behaviour you never saw: " +
          "because what you saw were the likeliest paths, and your users are sampling the rest on your behalf.",
      },
    ],
    faq: {
      q: {
        zh: "那怎么调试一个不确定的东西？",
        en: "How do you debug something that is not deterministic?",
      },
      a: {
        zh:
          "把注意力从「这一次为什么错」挪到「这一类多久错一次」。具体做法有三条：" +
          "跑多次并记录分布，而不是复现单次；把每一轮的完整数组存下来，" +
          "这样至少那一次的路径是可以逐步重看的；以及把不确定性挡在边界外——" +
          "有副作用的动作要审批（第 12 站），工具要能安全重复调用（后面会讲）。" +
          "你消不掉随机性，但你可以让它出错时的代价变小。",
        en:
          "Move your attention from why this run was wrong to how often this kind of run is wrong. In " +
          "practice: run it several times and record the distribution rather than trying to reproduce one " +
          "case; save the full array from each round, so that at least that path can be walked again " +
          "afterwards; and keep the uncertainty away from the edges — approval for anything with a side " +
          "effect (stop 12), and tools that are safe to call twice. You cannot remove the randomness. You can " +
          "make being wrong cheap.",
      },
    },
  },
];

export const bench = {
  title: { zh: "同一个任务，跑很多次", en: "One task, run many times" },
  note: { zh: "示例分布，非实测", en: "an illustrative distribution" },
  task: {
    zh: "任务：这个项目里还剩多少个 TODO 注释？",
    en: "Task: how many TODO comments are left in this project?",
  },
  again: { zh: "再跑一次", en: "Run it again" },
  tenMore: { zh: "连跑 10 次", en: "Run ten more" },
  clear: { zh: "清空计数", en: "Clear the tally" },
  tempLabel: { zh: "温度", en: "Temperature" },
  thisRun: { zh: "这一次它决定", en: "This run, it decided to" },
  runs: { zh: "已跑", en: "runs so far" },
  tally: { zh: "各条路出现的次数", en: "How often each path came up" },
  kindGood: { zh: "答对", en: "correct" },
  kindSlower: { zh: "答对但多花一轮", en: "correct, one round slower" },
  kindWrong: { zh: "有问题", en: "goes wrong" },
  tempNote: {
    zh: "温度 0：永远选概率最高的那条。温度越高，后面几条越有机会。",
    en: "At 0 the likeliest path is taken every time. The higher it goes, the more the others get a turn.",
  },
};
