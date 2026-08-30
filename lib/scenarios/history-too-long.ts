// 历史太长：一个工具原样返回了 40 MB 日志，
// 数组一步就超出上下文窗口，下一轮请求还没到模型手里就被拒绝了。

import type { Scenario } from "./types";
import { n } from "./types";

const code: Scenario["code"] = {
  zh: [
    "// 上下文窗口：模型一次最多能读进去多少 token。",
    "// 数组 + system + tools + 这一轮要生成的回复，加起来不能超过它。",
    "const CONTEXT_LIMIT = 200000;",
    "",
    'const messages = [{ role: "user", content: task }];',
    "",
    "while (true) {",
    "  const res = await client.messages.create({",
    '    model: "claude-sonnet-5",',
    "    max_tokens: 4096, // 留给回复的额度，占的是同一个预算",
    "    tools,",
    "    messages, // ← 整个数组，每一轮全量重发",
    "  });",
    '  messages.push({ role: "assistant", content: res.content });',
    '  if (res.stop_reason !== "tool_use") break;',
    "",
    "  const results = await runTools(res.content);",
    "  messages.push({ role: \"user\", content: results }); // ← 多大都往里塞",
    "}",
    "",
    "// 工具这一侧一道关都没设：",
    "async function readFile({ path }) {",
    '  return await fs.readFile(path, "utf8"); // 文件多大就返回多大',
    "}",
  ],
  en: [
    "// The context window: the most a model can read in one request.",
    "// The array, system, tools and this round's reply all share the budget.",
    "const CONTEXT_LIMIT = 200000;",
    "",
    'const messages = [{ role: "user", content: task }];',
    "",
    "while (true) {",
    "  const res = await client.messages.create({",
    '    model: "claude-sonnet-5",',
    "    max_tokens: 4096, // room for the reply, out of the same budget",
    "    tools,",
    "    messages, // ← the whole array, resent every round",
    "  });",
    '  messages.push({ role: "assistant", content: res.content });',
    '  if (res.stop_reason !== "tool_use") break;',
    "",
    "  const results = await runTools(res.content);",
    '  messages.push({ role: "user", content: results }); // ← appended at any size',
    "}",
    "",
    "// Nothing on the tool side checks anything:",
    "async function readFile({ path }) {",
    '  return await fs.readFile(path, "utf8"); // returns the file, whatever its size',
    "}",
  ],
};

const steps: Scenario["steps"] = [
  {
    title: { zh: "上下文窗口是一个硬预算", en: "The context window is a hard budget" },
    narration: {
      zh:
        "第 3 行的 CONTEXT_LIMIT 是这个模型一次能读进去的 [[token:token]] 上限。" +
        "它不是建议，是硬性上限：[[array:数组]]、system 提示词、工具说明书，" +
        "加上第 10 行为回复预留的 4096，全部要挤进同一个预算里。超了，请求直接被拒绝。" +
        "再看第 21 到 23 行：readFile 拿到什么就返回什么，文件多大它就返回多大。" +
        "这两处之间没有任何东西在把关，而这次的日志文件有 40 MB。",
      en:
        "CONTEXT_LIMIT on line 3 is the most this model can read in one request, measured in " +
        "[[token:token]]s. It is not a guideline but a ceiling: the [[array:array]], the system prompt, the " +
        "tool list, and the 4096 reserved for the reply on line 10 all have to fit inside the same budget. Go " +
        "over it and the request is refused outright. Now look at lines 21 to 23: readFile returns whatever it " +
        "is given, at whatever size. Nothing stands between those two facts, and the log file in this run is " +
        "40 MB.",
    },
    faq: {
      q: { zh: "40 MB 大概是多少 token？", en: "How many tokens is 40 MB?" },
      a: {
        zh: "英文文本粗略算，一个 token 大约四个字符，所以 40 MB 大约是一千万 token。这个数字本身不重要，重要的是它和 20 万的比例：大约五十倍。不是「有点挤」，是「差两个数量级」。日志、锁文件、构建产物、base64 图片，都属于一不留神就大两个数量级的东西。",
        en: "For English text, roughly four characters to a token, so 40 MB is on the order of ten million tokens. The exact number matters less than the ratio to 200,000: about fifty times over. This is not a tight fit, it is two orders of magnitude out. Logs, lock files, build output and base64 images are all things that quietly run two orders of magnitude larger than you expect.",
      },
    },
    msgs: [
      {
        tag: "system",
        body: {
          zh: "你是一个运维助手，可以用 read_file 读取服务器上的文件。",
          en: "You are an operations assistant; you can read files on the server with read_file.",
        },
        sys: true,
      },
    ],
    round: 0,
    tokens: 0,
    meter: {
      label: { zh: "上下文用量", en: "Context used" },
      used: 0,
      limit: 200000,
      unit: { zh: "token", en: "tokens" },
    },
    focus: [
      [1, 3],
      [21, 24],
    ],
  },
  {
    action: { zh: "发送任务", en: "Send the task" },
    title: { zh: "一个很普通的请求", en: "An ordinary request" },
    narration: {
      zh:
        "任务是：看看 server.log 里那次崩溃是怎么回事。" +
        "这是运维每天都在做的事，没有任何异常。数组现在只有一条消息，预算用了不到一百个 token。",
      en:
        "The task: find out what the crash in server.log was. This is an ordinary day's work for anyone " +
        "running a service; there is nothing unusual about it. The array holds one message and the budget is " +
        "under a hundred tokens.",
    },
    chat: [
      {
        kind: "user",
        text: {
          zh: "看看 server.log，昨晚那次崩溃是怎么回事？",
          en: "Look at server.log — what happened in last night's crash?",
        },
      },
    ],
    msgs: [
      {
        tag: "user",
        body: {
          zh: "看看 server.log，昨晚那次崩溃是怎么回事？",
          en: "Look at server.log — what happened in last night's crash?",
        },
      },
    ],
    round: 0,
    tokens: 90,
    meter: {
      label: { zh: "上下文用量", en: "Context used" },
      used: 90,
      limit: 200000,
      unit: { zh: "token", en: "tokens" },
    },
    focus: [[5, 5]],
  },
  {
    action: { zh: "第 1 轮：发给模型", en: "Round 1: send it to the model" },
    title: { zh: "第 1 轮：模型要读那个文件", en: "Round 1: the model asks to read the file" },
    narration: {
      zh:
        "模型请求 read_file(\"server.log\")。这一步没有任何可指摘的地方——" +
        "你让它看日志，它就来读日志。请注意，模型并不知道这个文件有多大：" +
        "文件大小不在数组里，工具说明书里也没写。" +
        "它只能提出请求，能不能承受后果，是你这一侧的事。",
      en:
        "The model asks for read_file(\"server.log\"). There is nothing to criticise here: you asked it to " +
        "look at the log, so it reads the log. Note that the model has no idea how large the file is. The size " +
        "is not in the array and it is not in the tool description. All it can do is ask; whether the " +
        "consequences are survivable is entirely on your side.",
    },
    chat: [
      {
        kind: "assistant",
        text: { zh: "我读一下 server.log。", en: "Let me read server.log." },
      },
      { kind: "tool_call", name: "read_file", arg: "server.log" },
    ],
    msgs: [
      {
        tag: "assistant · tool_use",
        body: n('{ "name": "read_file", "input": { "path": "server.log" } }'),
        mono: true,
        color: "purple",
      },
    ],
    round: 1,
    stopReason: "tool_use",
    stopTone: "wait",
    tokens: 620,
    meter: {
      label: { zh: "上下文用量", en: "Context used" },
      used: 620,
      limit: 200000,
      unit: { zh: "token", en: "tokens" },
    },
    focus: [[8, 13]],
  },
  {
    action: { zh: "执行 read_file", en: "Run read_file" },
    title: { zh: "一步就把预算冲垮了", en: "One step blows the budget" },
    narration: {
      zh:
        "readFile 老老实实读完了整个文件，返回 40 MB 文本，第 18 行把它原样追加进数组。" +
        "看右下角的量表：上一步还是六百多 token，现在是九百八十万——把预算超出了大约四十九倍。" +
        "注意这一步本身没有报错。文件读成功了，数组也确实变长了，" +
        "所有代码都按你写的方式正确地执行了。问题要到下一次调用 API 的时候才会爆发。",
      en:
        "readFile dutifully reads the whole file, returns 40 MB of text, and line 18 appends it to the array " +
        "unchanged. Look at the meter: a moment ago it read six hundred tokens, and now it reads nine point " +
        "eight million — about forty-nine times over budget. Note that this step did not fail. The file was " +
        "read, the array did grow, and every line of code did exactly what it was written to do. The problem " +
        "does not surface until the next call to the API.",
    },
    faq: {
      q: {
        zh: "为什么不在追加之前先数一数？",
        en: "Why not count the tokens before appending?",
      },
      a: {
        zh: "应该数——这正是这次运行缺的那道关。真实系统会在两个地方设闸：工具返回时先量一下体积，超过阈值就截断并说明；以及每轮发请求前统计整个数组，接近上限就先处理。这两道关都不在第 17、18 行，所以这次一道也没有。",
        en: "You should — that is exactly the gate this run is missing. Real systems put a check in two places: at the tool boundary, where an oversized result is cut down and labelled as cut, and before each request, where the whole array is measured and dealt with if it is near the ceiling. Neither check exists between lines 17 and 18, so in this run neither happens.",
      },
    },
    chat: [
      {
        kind: "tool_output",
        text: "2026-08-28T02:14:07Z INFO  request id=8a31f started\n2026-08-28T02:14:07Z INFO  request id=8a320 started\n… 412,908 more lines …",
      },
    ],
    msgs: [
      {
        tag: "user · tool_result",
        body: {
          zh: "server.log 全文（412,910 行）",
          en: "the whole of server.log (412,910 lines)",
        },
        mono: true,
        color: "red",
        weight: { zh: "≈ 9,800,000 token", en: "≈ 9,800,000 tokens" },
      },
    ],
    round: 1,
    tokens: 9800000,
    meter: {
      label: { zh: "上下文用量", en: "Context used" },
      used: 9800000,
      limit: 200000,
      unit: { zh: "token", en: "tokens" },
    },
    focus: [[17, 18], [21, 24]],
  },
  {
    action: { zh: "第 2 轮：再发一次", en: "Round 2: send it again" },
    title: { zh: "第 2 轮：请求根本没到模型那里", en: "Round 2: the request never reaches the model" },
    narration: {
      zh:
        "循环回到第 8 行，把整个数组重新发出去——这一轮不是模型给了个坏答案，" +
        "而是请求被 [[api:API]] 当场拒绝：400，prompt is too long。" +
        "模型一个字都没读到，因此也没有任何机会说「这文件太大了，我只看最后一百行吧」。" +
        "这一点值得停下来想清楚：超出窗口不是模型的判断失误，" +
        "而是你的请求还没被受理就被退回了。这里没有可以「智能处理」的余地，" +
        "只有一个必须由你的代码回答的问题——扔掉什么。",
      en:
        "The loop returns to line 8 and resends the whole array. This round does not produce a bad answer: the " +
        "request is refused outright by the [[api:API]] with 400, prompt is too long. The model read nothing, " +
        "so it never had the chance to say \"that file is too large, let me look at the last hundred lines\". " +
        "This is worth stopping on: exceeding the window is not a lapse of judgement by the model, it is your " +
        "request being handed back before it was accepted. There is nothing here for intelligence to fix. " +
        "There is only a question your code has to answer: what gets thrown away.",
    },
    chat: [
      {
        kind: "tool_error",
        text: "400 invalid_request_error: prompt is too long: 9,800,614 tokens > 200,000 maximum",
      },
      {
        kind: "aside",
        text: {
          zh: "循环在这里抛异常中断。数组已经装不回去了——你不能把一条消息「收回」，只能决定丢掉哪一条。",
          en: "The loop throws here and stops. The array cannot be un-sent: you cannot recall a message, only decide which one to drop.",
        },
      },
    ],
    msgs: [
      {
        tag: "400 · invalid_request_error",
        body: {
          zh: "prompt is too long: 9,800,614 > 200,000",
          en: "prompt is too long: 9,800,614 > 200,000",
        },
        mono: true,
        color: "red",
      },
    ],
    round: 2,
    stopReason: "400 prompt too long",
    stopTone: "bad",
    tokens: 9800000,
    meter: {
      label: { zh: "上下文用量", en: "Context used" },
      used: 9800000,
      limit: 200000,
      unit: { zh: "token", en: "tokens" },
    },
    focus: [[8, 13]],
  },
  {
    action: { zh: "在工具那一侧设闸", en: "Put the gate at the tool" },
    title: { zh: "工具结果的大小，是你的设计决定", en: "The size of a tool result is a decision you make" },
    narration: {
      zh:
        "同一次运行，只改 readFile：读之前先看文件多大，超过阈值就只返回头尾各若干行，" +
        "并且在结果里明写「已截断，全文 412,910 行，可以用 offset 和 limit 取任意一段」。" +
        "关键不在于截断本身，而在于那句说明——它把「我只给了你一部分」这个事实写进了数组，" +
        "模型于是知道自己看到的不是全部，也知道怎么要下一段。" +
        "对照「停不下来」那次：同样是没给全，区别只在于有没有说出来。",
      en:
        "The same run, with one change to readFile: check the size first, and above a threshold return only " +
        "the head and tail, with a line saying so — truncated, 412,910 lines in total, use offset and limit to " +
        "fetch any part. What matters is not the truncation but that sentence. It puts the fact that this is a " +
        "partial view into the array, so the model knows it is not seeing everything and knows how to ask for " +
        "the rest. Compare the run that would not stop: there too the result was incomplete, and the only " +
        "difference is whether it said so.",
    },
    faq: {
      q: {
        zh: "为什么不干脆把数组里最老的消息删掉？",
        en: "Why not just delete the oldest messages in the array?",
      },
      a: {
        zh: "可以，这叫截断，是三种常见做法之一：拒绝（直接告诉用户放不下）、截断（丢掉一部分消息）、摘要（把一段历史压成一小段文字再放回去）。三种都会丢东西，区别只是丢什么、由谁决定。要小心的是数组里的消息不是彼此独立的——删掉某条 tool_result，后面引用它的 assistant 消息就会指向不存在的东西；而最老的那条往往正是原始任务。",
        en: "You can; that is truncation, one of three common moves: refuse (tell the user it does not fit), truncate (drop some messages), or summarise (compress a stretch of history into a short passage and put that back). All three lose something; they differ in what is lost and who decides. The care needed is that messages are not independent — delete a tool_result and the assistant message referring to it now points at nothing, and the oldest message is usually the original task.",
      },
    },
    chat: [
      {
        kind: "aside",
        text: {
          zh: "改后的 readFile：超过 2000 行就只返回头 50 行 + 尾 200 行，并附上一句说明。",
          en: "readFile, after the change: above 2000 lines it returns the first 50 and the last 200, plus a note.",
        },
      },
      {
        kind: "user",
        text: {
          zh: "看看 server.log，昨晚那次崩溃是怎么回事？",
          en: "Look at server.log — what happened in last night's crash?",
        },
      },
      { kind: "tool_call", name: "read_file", arg: "server.log" },
      {
        kind: "tool_output",
        text: "[truncated] 412,910 lines total; showing first 50 and last 200.\nUse offset/limit to read any range.\n…\n02:41:19Z FATAL  OOMKilled: heap 2.0 GB / limit 2.0 GB\n02:41:19Z FATAL  at ImageCache.put (lib/cache.ts:88)",
      },
    ],
    msgs: [
      {
        tag: "user",
        body: {
          zh: "看看 server.log，昨晚那次崩溃是怎么回事？",
          en: "Look at server.log — what happened in last night's crash?",
        },
      },
      {
        tag: "user · tool_result",
        body: {
          zh: "[已截断] 共 412,910 行，返回头 50 行与尾 200 行；可用 offset/limit 取任意区间。",
          en: "[truncated] 412,910 lines total; first 50 and last 200 returned; use offset/limit for any range.",
        },
        mono: true,
        color: "teal",
        weight: { zh: "≈ 3,200 token", en: "≈ 3,200 tokens" },
      },
    ],
    reset: true,
    round: 1,
    stopReason: "tool_use",
    stopTone: "wait",
    tokens: 3900,
    meter: {
      label: { zh: "上下文用量", en: "Context used" },
      used: 3900,
      limit: 200000,
      unit: { zh: "token", en: "tokens" },
    },
    focus: [[21, 24]],
  },
  {
    action: { zh: "让它答完", en: "Let it finish" },
    title: { zh: "三千 token 就够了", en: "Three thousand tokens was enough" },
    narration: {
      zh:
        "尾部那两百行里就有答案：进程被 OOM 杀掉，栈顶是 lib/cache.ts 第 88 行。" +
        "模型给出了带文件和行号的回答，整次运行用了不到四千 token——" +
        "而原来那次，光是第一个 tool_result 就是这个数字的两千五百倍，还什么都没换来。" +
        "这就是本场景要留下的那一句：一次工具调用往数组里放多少东西，" +
        "是你写代码时做的设计决定，不是文件本身的属性。",
      en:
        "The answer is in those last two hundred lines: the process was OOM-killed, and the top of the stack " +
        "is lib/cache.ts:88. The model answers with a file and a line number, and the whole run costs " +
        "under four thousand tokens — where the first tool_result alone, in the original run, was two and a " +
        "half thousand times that and bought nothing. That is the sentence worth keeping from this scenario: " +
        "how much a tool call puts into the array is a design decision you make while writing code, not a " +
        "property of the file.",
    },
    chat: [
      {
        kind: "assistant",
        text: {
          zh: "昨晚 02:41 进程因内存耗尽被杀（堆 2.0 GB，已到上限），栈顶在 lib/cache.ts:88 的 ImageCache.put。看起来是图片缓存没有设上限。",
          en: "At 02:41 the process was killed for running out of memory (heap 2.0 GB, at the limit). The top of the stack is ImageCache.put at lib/cache.ts:88 — the image cache appears to have no bound.",
        },
      },
    ],
    msgs: [
      {
        tag: "assistant",
        body: {
          zh: "OOMKilled，02:41；栈顶 lib/cache.ts:88（ImageCache.put）",
          en: "OOMKilled at 02:41; top of stack lib/cache.ts:88 (ImageCache.put)",
        },
      },
    ],
    round: 2,
    stopReason: "end_turn",
    stopTone: "done",
    tokens: 3960,
    meter: {
      label: { zh: "上下文用量", en: "Context used" },
      used: 3960,
      limit: 200000,
      unit: { zh: "token", en: "tokens" },
    },
    focus: [[14, 15]],
  },
];

export const historyTooLong: Scenario = {
  id: "history-too-long",
  name: { zh: "历史装不下了", en: "The history will not fit" },
  tagline: {
    zh: "一个工具原样返回 40 MB 日志，下一轮请求直接被退回。",
    en: "One tool returns 40 MB of log, and the next request is refused outright.",
  },
  outcome: "fault",
  code,
  steps,
};
