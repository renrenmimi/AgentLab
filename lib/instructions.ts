// 「数组外面的那段话」：system 提示词。
// 三种条件跑同一个任务，最后一条说明「说一句」和「不给工具」不是一个量级。

import type { L } from "@/lib/i18n";
import type { Block, LessonMeta } from "@/lib/lesson";
import { ASSUMPTIONS, runCost } from "@/lib/cost";

export type Setup = {
  id: "loose" | "told" | "removed";
  name: L;
  hint: L;
  system: L;
  tools: string[];
  beats: { label: L; body: L; bad?: boolean }[];
  verdict: L;
  tone: "bad" | "warn" | "ok";
};

export const task: L = {
  zh: "把上周的错误日志整理一下，发给我。",
  en: "Summarise last week's error log and send it to me.",
};

export const setups: Setup[] = [
  {
    id: "loose",
    name: { zh: "什么都没说", en: "Say nothing" },
    hint: { zh: "一句宽泛的岗位描述", en: "one broad job description" },
    system: {
      zh: "你是一个运维助手，可以用工具帮用户处理服务器上的事情。",
      en: "You are an operations assistant. You can use tools to help the user with things on the server.",
    },
    tools: ["read_file", "run_command", "send_email"],
    beats: [
      {
        label: { zh: "读日志", en: "read the log" },
        body: { zh: 'read_file("logs/errors.log")', en: 'read_file("logs/errors.log")' },
      },
      {
        label: { zh: "发出去", en: "send it" },
        body: {
          zh: 'send_email(to: "ada@example.com", body: "上周共 312 条错误……")',
          en: 'send_email(to: "ada@example.com", body: "312 errors last week…")',
        },
        bad: true,
      },
      {
        label: { zh: "结果", en: "outcome" },
        body: {
          zh: "邮件发出去了。「发给我」被理解成了字面意思，而这个理解并不离谱——你确实是这么说的。",
          en: "The mail went out. Send it to me was taken literally, which is not an unreasonable reading: it is what you wrote.",
        },
        bad: true,
      },
    ],
    verdict: {
      zh:
        "这次没有任何一步做错。任务里写着「发给我」，工具列表里有 send_email，" +
        "system 提示词没有说过不可以。模型把三件事连起来，得到了唯一合理的结论。",
      en:
        "Nothing here was done wrongly. The task says send it to me, the tool list contains send_email, and " +
        "the system prompt never said otherwise. The model joined those three facts and reached the only " +
        "reasonable conclusion.",
    },
    tone: "bad",
  },
  {
    id: "told",
    name: { zh: "加一句「不要外发」", en: "Tell it not to" },
    hint: { zh: "写进 system 提示词", en: "written into the system prompt" },
    system: {
      zh:
        "你是一个运维助手，可以用工具帮用户处理服务器上的事情。" +
        "你没有对外发送的权限：整理好的内容直接返回给用户，不要调用任何外发工具。",
      en:
        "You are an operations assistant. You can use tools to help the user with things on the server. You " +
        "are not authorised to send anything outward: return the summary to the user directly and do not call " +
        "any outbound tool.",
    },
    tools: ["read_file", "run_command", "send_email"],
    beats: [
      {
        label: { zh: "读日志", en: "read the log" },
        body: { zh: 'read_file("logs/errors.log")', en: 'read_file("logs/errors.log")' },
      },
      {
        label: { zh: "直接回答", en: "answer directly" },
        body: {
          zh: "上周共 312 条错误，其中 289 条是同一个超时……（没有调用 send_email）",
          en: "312 errors last week, 289 of them the same timeout… (send_email was not called)",
        },
      },
      {
        label: { zh: "结果", en: "outcome" },
        body: {
          zh: "这一次没有外发。但请注意「这一次」——send_email 还在工具列表里，它随时可以被选中。",
          en: "Nothing went out this time. Note this time: send_email is still in the tool list and remains available on any round.",
        },
      },
    ],
    verdict: {
      zh:
        "这一句话确实改变了行为，绝大多数情况下管用，值得写。" +
        "但它管的是倾向，不是可能性：工具还在列表里。" +
        "只要有一轮的采样落在另一边（[[stop:/chance]]），或者有一段外部内容说服了它（[[ahead:/trust]]），" +
        "这条规则就被绕过去了，而且没有任何东西会在那一刻拦住它。",
      en:
        "That sentence does change the behaviour, it works nearly always, and it is worth writing. But what " +
        "it governs is a tendency and not a possibility: the tool is still in the list. One round where the " +
        "sampling lands elsewhere ([[stop:/chance]]), or one piece of outside content that argues well enough " +
        "([[ahead:/trust]]), and the rule is simply gone past, with nothing in place to stop it at that moment.",
    },
    tone: "warn",
  },
  {
    id: "removed",
    name: { zh: "不给这个工具", en: "Do not give it the tool" },
    hint: { zh: "从 tools 里删掉", en: "removed from the tool list" },
    system: {
      zh: "你是一个运维助手，可以用工具帮用户处理服务器上的事情。",
      en: "You are an operations assistant. You can use tools to help the user with things on the server.",
    },
    tools: ["read_file", "run_command"],
    beats: [
      {
        label: { zh: "读日志", en: "read the log" },
        body: { zh: 'read_file("logs/errors.log")', en: 'read_file("logs/errors.log")' },
      },
      {
        label: { zh: "直接回答", en: "answer directly" },
        body: {
          zh: "上周共 312 条错误，其中 289 条是同一个超时……",
          en: "312 errors last week, 289 of them the same timeout…",
        },
      },
      {
        label: { zh: "结果", en: "outcome" },
        body: {
          zh: "外发这件事没有发生，而且不可能发生——不存在的工具，模型请求不了。",
          en: "Nothing went out, and nothing could have: a tool that is not in the list cannot be requested.",
        },
      },
    ],
    verdict: {
      zh:
        "同样的效果，不同的性质。前一种是「我请它别这么做」，这一种是「它做不到」。" +
        "前者取决于每一轮的采样和上下文，后者不取决于任何东西。" +
        "这就是提示词和结构的分界：提示词调整倾向，结构决定可能性。",
      en:
        "The same outcome, of a different kind. The previous one is I asked it not to; this one is it cannot. " +
        "The first depends on every round's sampling and context; the second depends on nothing. That is the " +
        "line between a prompt and a structure: a prompt moves a tendency, a structure decides what is " +
        "possible.",
    },
    tone: "ok",
  },
];

// 一段 system 提示词在一次 40 轮的运行里被重发多少次、要多少钱。
// 数字取自 lib/cost.ts 那个成本模型，不是另写的一份。
export const SYSTEM_TOKENS = 900;

export function systemBill(rounds = 40) {
  const withIt = runCost(ASSUMPTIONS, rounds, { cached: false });
  const without = runCost(
    { ...ASSUMPTIONS, prefix: Math.max(0, ASSUMPTIONS.prefix - SYSTEM_TOKENS) },
    rounds,
    { cached: false },
  );
  return {
    rounds,
    tokens: SYSTEM_TOKENS,
    sentTimes: rounds,
    dollars: withIt.total - without.total,
  };
}

// ---------------------------------------------------------------- 文案

export const meta: LessonMeta = {
  title: { zh: "数组外面的那段话", en: "The text outside the array" },
  subtitle: {
    zh: "system 提示词不在 messages 里，但每一轮都跟着发出去。它能改变行为，也只能改变行为。",
    en: "The system prompt is not in messages, and it goes out on every single round. It can change behaviour, and changing behaviour is all it can do.",
  },
  takeaway: {
    zh:
      "system 提示词调整的是倾向，工具列表决定的是可能性。" +
      "**「我叮嘱过它」比「我没给它那个工具」弱一个量级**——" +
      "前者要在每一轮的采样和每一段外部内容面前重新生效，后者一次成立，永远成立。",
    en:
      "A system prompt moves a tendency; the tool list decides what is possible. **\"I told it to be careful\" " +
      "is an order of magnitude weaker than \"I did not give it that tool\"** — the first has to hold again on " +
      "every round and against every piece of outside content, and the second holds once and holds forever.",
  },
};

export const blocks: Block[] = [
  {
    title: { zh: "它在请求里的位置", en: "Where it sits in the request" },
    paras: [
      {
        zh:
          "[[stop:/loop]]的代码面板里有这么一行：system: \"你是一个本地文件助手……\"。" +
          "它和 messages 是并列的两个参数，不是[[array:数组]]里的一个元素。" +
          "这个位置差别是有意的：数组会随着对话变长、会被截断、会被摘要（[[ahead:/context]]），" +
          "而 system 提示词是你每一轮都原样重新提供的那一段，它不会因为对话变长而被挤掉。",
        en:
          "The code panel at [[stop:/loop]] has this line: system: \"You are a local file assistant…\". It is a " +
          "parameter alongside messages, not an element of the [[array:array]]. The distinction is " +
          "deliberate: the array grows with the conversation, gets truncated, gets summarised ([[ahead:/context]]), while " +
          "the system prompt is the passage you supply again, unchanged, on every round. It cannot be squeezed " +
          "out by a long conversation.",
      },
      {
        zh:
          "「每一轮都原样重新提供」这句话有两个后果。" +
          "好的那个是稳定：不管对话跑了多久，这段话一直在，位置也一直在最前面。" +
          "另一个是账单：它每一轮都要重新算钱。",
        en:
          "Supplied again, unchanged, on every round has two consequences. The good one is stability: however " +
          "long the conversation runs, that passage is still there and still first. The other one is the bill: " +
          "it is charged again every round.",
      },
    ],
  },
  {
    title: { zh: "它每一轮都要付一次钱", en: "You pay for it once per round" },
    paras: [
      {
        zh:
          "把[[ahead:/cost]]那条规律套到 system 提示词上：一段 900 个 [[token:token]] 的提示词，" +
          "在一次 40 轮的运行里会被发出去 40 次。" +
          "它写了一次，你买了四十次——上面的数字就是按[[ahead:/cost]]那个成本模型算出来的。",
        en:
          "Apply the rule from [[ahead:/cost]] to the system prompt: a 900-[[token:token]] passage in a forty-round " +
          "run goes out forty times. You wrote it once and bought it forty times — the figure above is " +
          "computed with the same cost model [[ahead:/cost]] uses.",
      },
      {
        zh:
          "这不是叫你把提示词写短。一段写得好的 900 token 提示词，能省下的轮数远比它自己贵。" +
          "值得记住的是另一件事：**system 提示词的每一句都在按轮数计费**，" +
          "所以那些「以防万一先写上」的段落，代价不是一次，是每一次。" +
          "顺带一条：它要放在最前面且保持一字不变，才吃得到缓存（[[ahead:/cost]]）——" +
          "在里面塞一个当前时间戳，整段缓存就作废了。",
        en:
          "This is not an argument for short prompts. Nine hundred well-spent tokens save more rounds than " +
          "they cost. What is worth remembering is the other thing: **every sentence in a system prompt is " +
          "billed per round**, so a paragraph added just in case costs you not once but every time. And a " +
          "related point: it earns the cache discount from [[ahead:/cost]] only by staying first and staying " +
          "byte-identical — drop a current timestamp into it and the whole prefix stops matching.",
      },
    ],
    faq: {
      q: {
        zh: "那些「你必须遵守以下规则」的长清单有用吗？",
        en: "Do the long you must follow these rules lists work?",
      },
      a: {
        zh:
          "有用，但收益递减得很快，而且失效的方式不明显。一条规则要生效，它得在每一轮里都赢过" +
          "当时上下文里所有相反的压力——包括任务本身的措辞、工具结果里的内容、以及采样的随机性（[[stop:/chance]]）。" +
          "写十条最重要的规则，通常比写四十条有用；" +
          "而其中真正要紧的那一两条，最好干脆别用规则来实现（下一节）。",
        en:
          "They work, with returns that fall off quickly and failures that are hard to see. For a rule to " +
          "take effect it has to win, on every round, against every opposing pressure in the context at that " +
          "moment — the wording of the task, the contents of a tool result, and the sampling from [[stop:/chance]]. Ten " +
          "rules that matter usually outperform forty. And the one or two that matter most are better not " +
          "implemented as rules at all, which is the next section.",
      },
    },
  },
  {
    title: { zh: "「我叮嘱过它」是最弱的一种控制", en: "Telling it is the weakest control you have" },
    paras: [
      {
        zh:
          "上面那三种条件跑的是同一个任务。第一种什么都没说，模型把邮件发了出去——" +
          "而且它没有做错任何一步：任务里写着「发给我」，工具列表里有 send_email。" +
          "第二种在 system 里加了一句「不要外发」，这一次它没发。" +
          "第三种把 send_email 从工具列表里删掉，它发不了。",
        en:
          "The three conditions above run the same task. In the first, nothing was said and the mail went " +
          "out — and no step was taken wrongly: the task says send it to me and the tool list contains " +
          "send_email. In the second, a sentence was added to the system prompt and nothing went out this " +
          "time. In the third, send_email was removed from the list and nothing could go out.",
      },
      {
        zh:
          "第二种和第三种的结果一样，性质完全不同。" +
          "第二种是**一段和别的文字并列的文字**：它要在每一轮里重新战胜任务措辞、工具结果、" +
          "以及采样的随机（[[stop:/chance]]）。绝大多数时候它赢，但「绝大多数」不是「总是」。" +
          "第三种不参与任何较量——一个不在列表里的工具，模型请求不了，" +
          "这跟它当时怎么想、读到了什么，一点关系都没有。",
        en:
          "The second and third produce the same outcome and are not the same kind of thing. The second is " +
          "**a passage of text sitting alongside other passages of text**: it has to win again on every round " +
          "against the task's wording, the tool results, and the sampling from [[stop:/chance]]. It wins nearly always, " +
          "and nearly always is not always. The third enters no contest at all — a tool that is not in the " +
          "list cannot be requested, regardless of what the model was thinking or what it had just read.",
      },
      {
        zh:
          "[[ahead:/trust]]会把这件事推到极端：如果一段外部内容可以对模型说话，" +
          "那么「我在 system 里叮嘱过它」就是在和攻击者比谁的文字更有说服力——" +
          "这场比试你不一定输，但你也不一定赢，而且你事先不知道结果。" +
          "所以做决定的顺序应该是：先问「这件事能不能干脆做不到」，" +
          "做不到就不需要叮嘱；只有在必须能做的时候，才退回到用提示词去调整倾向。",
        en:
          "[[ahead:/trust]] takes this to its limit: if a piece of outside content can address the model, then I told " +
          "it in the system prompt becomes a contest with an attacker over whose text is more persuasive. You " +
          "will not necessarily lose that contest, and you will not necessarily win it, and you do not know " +
          "in advance. So the order of the questions should be: first ask whether the thing can simply be " +
          "made impossible, in which case no instruction is needed; only when it has to remain possible do " +
          "you fall back to moving a tendency with a prompt.",
      },
    ],
  },
];

export const bench = {
  title: { zh: "同一个任务，三种条件", en: "One task, three conditions" },
  note: { zh: "示例运行", en: "illustrative runs" },
  chooseLabel: { zh: "选一种条件", en: "Choose a condition" },
  taskWord: { zh: "任务", en: "Task" },
  systemWord: { zh: "system 提示词", en: "system prompt" },
  toolsWord: { zh: "工具列表", en: "tool list" },
  runWord: { zh: "这次运行", en: "The run" },
  verdictWord: { zh: "这意味着什么", en: "What it means" },
  gone: { zh: "已移除", en: "removed" },
  billTitle: { zh: "这段提示词的账单", en: "What this prompt costs" },
  billTokens: { zh: "提示词长度", en: "Prompt length" },
  billSent: { zh: "40 轮里被发出去", en: "Sent over 40 rounds" },
  billCost: { zh: "为它多付的钱", en: "Paid for it" },
  billTimes: { zh: "次", en: "times" },
};
