// 选错工具：两个工具的说明写得含糊，模型挑了错的那个，
// 而修好它的办法不是改代码，是改那一句 description。

import type { Scenario } from "./types";
import { n } from "./types";

const code: Scenario["code"] = {
  zh: [
    "// 工具说明书。这段内容会随每一轮请求一起发给模型，",
    "// 模型能读到的只有这里写的字——函数体它一个字也看不见。",
    "const tools = [",
    "  {",
    '    name: "search",',
    '    description: "搜索。", // ← 说了等于没说',
    '    input_schema: { type: "object", properties: { query: { type: "string" } } },',
    "  },",
    "  {",
    '    name: "search_web",',
    '    description: "在互联网上搜索并返回结果。", // ← 至少说清了做什么',
    '    input_schema: { type: "object", properties: { query: { type: "string" } } },',
    "  },",
    "];",
    "",
    'const messages = [{ role: "user", content: task }];',
    "",
    "while (true) {",
    "  const res = await client.messages.create({",
    '    model: "claude-sonnet-5",',
    "    max_tokens: 4096,",
    "    tools, // 说明书每一轮都重新发一次",
    "    messages,",
    "  });",
    '  messages.push({ role: "assistant", content: res.content });',
    '  if (res.stop_reason !== "tool_use") break;',
    '  messages.push({ role: "user", content: await runTools(res.content) });',
    "}",
  ],
  en: [
    "// The tool list. This travels with every request, and the words written",
    "// here are all the model can read — it never sees the function bodies.",
    "const tools = [",
    "  {",
    '    name: "search",',
    '    description: "Search.", // ← says nothing',
    '    input_schema: { type: "object", properties: { query: { type: "string" } } },',
    "  },",
    "  {",
    '    name: "search_web",',
    '    description: "Search the internet and return results.", // ← at least says what it does',
    '    input_schema: { type: "object", properties: { query: { type: "string" } } },',
    "  },",
    "];",
    "",
    'const messages = [{ role: "user", content: task }];',
    "",
    "while (true) {",
    "  const res = await client.messages.create({",
    '    model: "claude-sonnet-5",',
    "    max_tokens: 4096,",
    "    tools, // the list is resent every round",
    "    messages,",
    "  });",
    '  messages.push({ role: "assistant", content: res.content });',
    '  if (res.stop_reason !== "tool_use") break;',
    '  messages.push({ role: "user", content: await runTools(res.content) });',
    "}",
  ],
};

const steps: Scenario["steps"] = [
  {
    title: { zh: "两个工具，两句说明", en: "Two tools, two descriptions" },
    narration: {
      zh:
        "这次有两个工具：search 在本项目的文件里搜，search_web 查公开网络——这是你知道的，模型不知道。" +
        "它能读到的只有每个工具的名字、description 和参数格式，看不到函数体，" +
        "也不知道你心里那个「显然应该用第一个」的想法。名字 search 什么都没透露，" +
        "于是第 6 行和第 11 行这两句 description 就成了它选工具的主要依据：一句是「搜索。」，" +
        "另一句是「在互联网上搜索并返回结果。」先记住这个不对称：第一个工具连搜哪里都没说，第二个至少说清了自己做什么。",
      en:
        "There are two tools this time: search, which searches the files of this project, and search_web, " +
        "which queries the public internet — you know that, and the model does not. All it can read is each " +
        "tool's name, description and parameter format. It cannot see the function bodies, and it has no " +
        "access to your private sense that the first one is obviously the right one. The name search gives " +
        "nothing away, so the two descriptions on lines 6 and 11 become most of what it chooses by: " +
        "\"Search.\" and \"Search the internet and return results.\" Note the asymmetry: the first does not " +
        "even say where it searches, and the second at least says what it does.",
    },
    faq: {
      q: {
        zh: "description 是写给人看的注释吗？",
        en: "Is the description a comment for human readers?",
      },
      a: {
        zh: "不是。它是提示词的一部分：tools 和 system 一样是 create 的单独参数，不在[[array:数组]]里，但每一轮都和数组一起发给同一个模型去读。你写在 description 里的每一句话都会影响模型的选择，而写在函数体里的注释一个字都不会。把它当成「写给模型的使用说明」，不是「写给同事的文档」。",
        en: "No. It is part of the prompt: like system, tools is a separate parameter of the create call rather than part of the [[array:array]], but it goes out with the array on every round and is read by the same model. Every sentence you put in a description changes what the model picks; not one word inside the function body does. Treat it as instructions written for the model, not documentation written for a colleague.",
      },
    },
    msgs: [
      {
        tag: "system",
        body: {
          zh: "你是一个代码助手，可以用工具查找信息。",
          en: "You are a coding assistant; you can look things up with tools.",
        },
        sys: true,
      },
      {
        tag: "tools",
        body: {
          zh: 'search：“搜索。” ／ search_web：“在互联网上搜索并返回结果。”',
          en: 'search: "Search." / search_web: "Search the internet and return results."',
        },
        mono: true,
        sys: true,
      },
    ],
    round: 0,
    tokens: 0,
    focus: [
      [1, 2],
      [4, 13],
    ],
  },
  {
    action: { zh: "发送任务", en: "Send the task" },
    title: { zh: "一个只可能在本项目里有答案的问题", en: "A question only this project can answer" },
    narration: {
      zh:
        "任务是：这个项目在哪里读取 API key。" +
        "这个问题的答案只可能存在于这个仓库里——互联网上没有任何一页写着你的代码把 key 放在哪一行。" +
        "所以正确的工具毫无疑问是 search。接下来看模型选了哪个。",
      en:
        "The task: where does this project read the API key. The answer can only exist inside this repository — " +
        "no page on the internet says which line of your code reads your key. So the correct tool is " +
        "unambiguously search. Watch which one the model picks.",
    },
    chat: [
      {
        kind: "user",
        text: {
          zh: "这个项目在哪里读取 API key？",
          en: "Where does this project read the API key?",
        },
      },
    ],
    msgs: [
      {
        tag: "user",
        body: {
          zh: "这个项目在哪里读取 API key？",
          en: "Where does this project read the API key?",
        },
      },
    ],
    round: 0,
    focus: [[16, 16]],
  },
  {
    action: { zh: "发给模型", en: "Send it to the model" },
    title: { zh: "第 1 轮：它选了 search_web", en: "Round 1: it picks search_web" },
    narration: {
      zh:
        "模型请求的是 search_web。这不是掷骰子掷歪了，而是两句说明比较之后的结果：" +
        "「在互联网上搜索并返回结果」是一句完整的承诺，模型知道调用它会得到什么；" +
        "「搜索。」没有承诺任何东西——没说搜什么、没说搜哪里、没说返回什么。" +
        "在两个候选里，一个说清了用途，另一个什么都没说，被选中的是前者。" +
        "这里有一条反直觉的结论：一个什么都没说的工具不会变成中立的默认项，反而更难被选中——" +
        "模型宁可选一个说清了用途、但用途不对的工具。",
      en:
        "The model asks for search_web. This is not a coin flip that landed badly; it is the result of " +
        "comparing two sentences. \"Search the internet and return results\" is a complete promise: the model " +
        "knows what calling it will produce. \"Search.\" promises nothing — not what it searches, not where, " +
        "not what comes back. Given one candidate that states its purpose and one that states nothing, the " +
        "first is chosen. There is a counter-intuitive lesson here: a tool whose description says nothing does " +
        "not become a neutral default. It becomes harder to pick than a tool that states a purpose, even the " +
        "wrong one.",
    },
    faq: {
      q: {
        zh: "这算模型的错，还是我的错？",
        en: "Is this the model's mistake or mine?",
      },
      a: {
        zh: "分清这一点很重要，因为它决定你去修哪里。如果算模型的错，你会去换模型、加一句“请仔细思考”——这些都很难奏效。如果算说明书的错，你会去改那两行字，而那正是真正能修好它的地方。一个可靠的判断办法：把两句 description 抄下来给一个完全不了解这个项目的人看，问他该用哪个。他答不上来，模型也答不上来。",
        en: "The distinction matters because it decides where you go to fix it. Blame the model and you will swap models and add \"please think carefully\" — neither is likely to help. Blame the descriptions and you will change two lines of prose, which is what actually fixes it. A reliable test: copy the two descriptions to someone who has never seen the project and ask which one they would use. If they cannot tell, neither can the model.",
      },
    },
    chat: [
      {
        kind: "assistant",
        text: {
          zh: "我去查一下 API key 通常是怎么读取的。",
          en: "Let me look up how API keys are usually read.",
        },
      },
      { kind: "tool_call", name: "search_web", arg: "how to read an API key" },
    ],
    msgs: [
      {
        tag: "assistant · tool_use",
        body: n('{ "name": "search_web", "input": { "query": "how to read an API key" } }'),
        mono: true,
        color: "purple",
      },
    ],
    round: 1,
    stopReason: "tool_use",
    stopTone: "wait",
    tokens: 540,
    focus: [[9, 13]],
  },
  {
    action: { zh: "执行 search_web", en: "Run search_web" },
    title: { zh: "结果很像样，但和这个项目无关", en: "The results look fine and have nothing to do with this project" },
    narration: {
      zh:
        "返回的是三条关于「如何管理 API key」的通用文章。它们没有报错，格式正确，读起来也确实有道理——" +
        "只是没有一个字来自你的仓库。这是这类故障最难发现的地方：" +
        "工具正常工作了，数组正常变长了，循环正常继续了，唯一出问题的是「问对了地方吗」，" +
        "而这件事在数据里没有留下任何痕迹。",
      en:
        "Back come three general articles about managing API keys. Nothing errored, the format is correct, and " +
        "the advice is perfectly sensible — none of it comes from your repository. This is what makes the " +
        "failure hard to spot: the tool worked, the array grew, the loop continued. The only thing that went " +
        "wrong is whether the right place was asked, and that leaves no trace in the data.",
    },
    chat: [
      {
        kind: "tool_output",
        text: "1. Best practices for storing API keys (blog)\n2. Twelve-factor config: keep secrets in the environment\n3. dotenv: loading .env files in Node",
      },
    ],
    msgs: [
      {
        tag: "user · tool_result",
        body: {
          zh: "3 条网页结果：密钥管理最佳实践、十二要素配置、dotenv 用法",
          en: "3 web results: key-management best practices, twelve-factor config, dotenv usage",
        },
        mono: true,
        color: "amber",
      },
    ],
    round: 1,
    focus: [[26, 27]],
  },
  {
    action: { zh: "发回模型（第 2 轮）", en: "Send it back (round 2)" },
    title: { zh: "第 2 轮：一个自信的、错的答案", en: "Round 2: a confident answer that is wrong" },
    narration: {
      zh:
        "模型基于手上的材料给出了回答：大概是从环境变量读的，多半通过 .env。" +
        "stop_reason 是 end_turn，循环正常结束，没有报错，没有超时，没有烧保险丝。" +
        "从程序的角度看，这次运行完全成功。" +
        "但答案里没有一个文件名、没有一个行号，因为数组里从头到尾就没有过这个项目的任何信息。" +
        "这比「停不下来」危险得多：那次的失败会自己叫出声，这次的失败会安安静静地交付给用户。",
      en:
        "The model answers from the material it has: probably read from an environment variable, most likely " +
        "through .env. stop_reason is end_turn, the loop ends normally, nothing errored, nothing timed out, no " +
        "fuse blew. As a program, this run succeeded completely. But the answer contains no filename and no " +
        "line number, because at no point did the array contain a single fact about this project. That makes " +
        "it far more dangerous than the run that would not stop: that failure announces itself, and this one " +
        "is delivered quietly to the user.",
    },
    faq: {
      q: {
        zh: "怎么才能发现这种「悄悄错了」的运行？",
        en: "How do you catch a run that fails quietly?",
      },
      a: {
        zh: "看数组，不要看结论。一个可靠的习惯：读答案之前先问「支撑这句话的 tool_result 是哪一条」。上面这次运行里，答案引用不到任何一条来自本项目的结果，问题当场就暴露了。答案本身读起来永远是通顺的，通顺不是证据。",
        en: "Read the array, not the conclusion. A reliable habit: before reading the answer, ask which tool_result supports it. In the run above, the answer can point to no result that came from this project, and the problem is visible immediately. An answer always reads fluently; fluency is not evidence.",
      },
    },
    chat: [
      {
        kind: "assistant",
        text: {
          zh: "这个项目应该是从环境变量里读取 API key 的，通常会配合 .env 文件，用 dotenv 之类的库加载。",
          en: "This project most likely reads the API key from an environment variable, usually together with a .env file loaded by something like dotenv.",
        },
      },
      {
        kind: "aside",
        text: {
          zh: "读起来很合理，但它引用不到本项目的任何一行代码。这是一个没有依据的答案。",
          en: "It reads sensibly, and it cites not one line of this project. This answer has no evidence behind it.",
        },
      },
    ],
    msgs: [
      {
        tag: "assistant",
        body: {
          zh: "应该是从环境变量读取的，通常配合 .env……（没有引用本项目的任何内容）",
          en: "Probably from an environment variable, usually with a .env file… (cites nothing from this project)",
        },
        color: "amber",
      },
    ],
    round: 2,
    stopReason: "end_turn",
    stopTone: "bad",
    tokens: 1180,
    focus: [[25, 26]],
  },
  {
    action: { zh: "改那两句说明", en: "Rewrite the two descriptions" },
    title: { zh: "唯一要改的东西：两句话", en: "The only thing to change: two sentences" },
    narration: {
      zh:
        "不换模型，不加「请仔细思考」，不改循环，不动 input_schema。只把第 6 行和第 11 行重写：" +
        "search 改成「在当前项目目录的文件内容里做全文搜索。关于这个代码库本身的问题都用它」；" +
        "search_web 改成「查询公开网络。只有当信息不可能存在于本项目里时才用它」。" +
        "两句话都做了同一件事：说清楚边界，并且直接给出选择规则。" +
        "写工具说明的时候，「什么时候用我」通常比「我是什么」更重要。",
      en:
        "No new model, no \"please think carefully\", no change to the loop, no change to input_schema. Only " +
        "lines 6 and 11 are rewritten. search becomes \"Full-text search over the files in the current " +
        "project directory. Use this for any question about this codebase.\" search_web becomes \"Query a " +
        "public web search engine. Use only when the information could not exist inside this project.\" Both " +
        "sentences do the same job: they state a boundary and hand the model a rule for choosing. When you " +
        "write a tool description, when to use me is usually worth more than what I am.",
    },
    chat: [
      {
        kind: "aside",
        text: {
          zh: "改前：search —「搜索。」　　改后：「在当前项目目录的文件内容里做全文搜索。关于这个代码库本身的问题都用它。」",
          en: 'Before: search — "Search."   After: "Full-text search over the files in the current project directory. Use this for any question about this codebase."',
        },
      },
      {
        kind: "aside",
        text: {
          zh: "改前：search_web —「在互联网上搜索并返回结果。」　　改后：「查询公开网络。只有当信息不可能存在于本项目里时才用它。」",
          en: 'Before: search_web — "Search the internet and return results."   After: "Query a public web search engine. Use only when the information could not exist inside this project."',
        },
      },
    ],
    msgs: [
      {
        tag: "tools",
        body: {
          zh: "search：项目内全文搜索，代码库问题都用它 ／ search_web：公开网络，仅限项目里不可能有的信息",
          en: "search: full-text search inside the project, for codebase questions / search_web: public web, only for what cannot be in the project",
        },
        mono: true,
        sys: true,
      },
    ],
    reset: true,
    round: 0,
    tokens: 0,
    focus: [
      [4, 13],
    ],
  },
  {
    action: { zh: "重放第 1 轮", en: "Replay round 1" },
    title: { zh: "同一个问题，这次选对了", en: "The same question, the right tool this time" },
    narration: {
      zh:
        "同一个任务原样再发一遍。这一次两句说明里都写着边界，" +
        "「这个项目在哪里读取 API key」显然落在 search 那一侧，模型直接请求了它。" +
        "工具返回了真正的证据：lib/client.ts 第 4 行。" +
        "接下来的回答里有文件名、有行号，可以被核对——这才是「有依据」和「读起来合理」的区别。",
      en:
        "The same task is sent again, unchanged. This time both descriptions state a boundary, \"where does " +
        "this project read the API key\" clearly falls on the search side, and the model asks for it " +
        "directly. The tool returns actual evidence: line 4 of lib/client.ts. The answer that follows carries " +
        "a filename and a line number, and can be checked. That is the difference between grounded and merely " +
        "plausible.",
    },
    faq: {
      q: {
        zh: "工具是不是越少越好？",
        en: "Are fewer tools better?",
      },
      a: {
        zh: "不是越少越好，是边界越清楚越好。两个职责分明的工具，比一个什么都能干、描述含糊的工具好用得多；但十个互相重叠的工具，会让每一轮选择都变成猜。判断标准很简单：任取两个工具，你能不能用一句话说清什么时候用这个、什么时候用那个。说不清，模型也分不清。",
        en: "Not fewer, sharper. Two tools with clean boundaries are far better than one vague tool that does everything; ten overlapping tools turn every round into a guess. The test is simple: take any two of your tools and state in one sentence when to use each. If you cannot, the model cannot either.",
      },
    },
    chat: [
      {
        kind: "user",
        text: {
          zh: "这个项目在哪里读取 API key？",
          en: "Where does this project read the API key?",
        },
      },
      {
        kind: "assistant",
        text: {
          zh: "这是关于本项目的问题，我在项目文件里搜。",
          en: "This is a question about this project, so I will search its files.",
        },
      },
      { kind: "tool_call", name: "search", arg: "API_KEY" },
      {
        kind: "tool_output",
        text: "lib/client.ts:4:  apiKey: process.env.ANTHROPIC_API_KEY,\n.env.example:1:  ANTHROPIC_API_KEY=",
      },
      {
        kind: "assistant",
        text: {
          zh: "在 lib/client.ts 第 4 行，通过 process.env.ANTHROPIC_API_KEY 读取；.env.example 里列出了这个变量名。",
          en: "In lib/client.ts line 4, via process.env.ANTHROPIC_API_KEY; the variable name is listed in .env.example.",
        },
      },
    ],
    msgs: [
      {
        tag: "user",
        body: {
          zh: "这个项目在哪里读取 API key？",
          en: "Where does this project read the API key?",
        },
      },
      {
        tag: "assistant · tool_use",
        body: n('{ "name": "search", "input": { "query": "API_KEY" } }'),
        mono: true,
        color: "purple",
      },
      {
        tag: "user · tool_result",
        body: n("lib/client.ts:4 · .env.example:1"),
        mono: true,
        color: "teal",
      },
      {
        tag: "assistant",
        body: {
          zh: "lib/client.ts:4 — process.env.ANTHROPIC_API_KEY",
          en: "lib/client.ts:4 — process.env.ANTHROPIC_API_KEY",
        },
      },
    ],
    round: 2,
    stopReason: "end_turn",
    stopTone: "done",
    tokens: 1280,
    focus: [
      [4, 8],
      [25, 26],
    ],
  },
];

export const wrongTool: Scenario = {
  id: "wrong-tool",
  name: { zh: "选错工具", en: "The wrong tool" },
  tagline: {
    zh: "一句什么都没说的工具说明，模型挑错了工具；只改两句说明就修好了，循环一行没动。",
    en: "A tool description that says nothing, and the wrong tool. Rewriting two sentences fixes it; the loop is untouched.",
  },
  outcome: "fault",
  code,
  steps,
};
