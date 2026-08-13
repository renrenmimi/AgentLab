// 第 2 站「看它怎么跑」的录制数据（双语）：一次 agent 运行被拆成若干步。
// 每一步描述：触发它的按钮文字（action）、标题（title）、详细讲解（narration）、
// 小白疑问（faq）、追加到对话面板的内容（chat）、追加到透视面板的卡片（msgs）、
// 以及这一步对应 agentCode 里哪几行（focus，1 起的闭区间）。

import type { L } from "@/lib/i18n";

// 中英相同的内容（命令输出、JSON 等）用这个包一下
const n = (s: string): L => ({ zh: s, en: s });

export type ChatItem =
  | { kind: "user"; text: L }
  | { kind: "assistant"; text: L }
  | { kind: "tool_call"; name: string; arg: string }
  | { kind: "tool_output"; text: string };

export type MsgCard = {
  tag: string;
  body: L;
  mono?: boolean;
  color?: "purple" | "teal";
  sys?: boolean; // system 提示词是单独参数，不占数组下标
};

export type Step = {
  action?: L;
  title: L;
  narration: L;
  faq?: { q: L; a: L };
  chat?: ChatItem[];
  msgs?: MsgCard[];
  round?: number;
  stopReason?: string;
  tokens?: number;
  focus: [number, number][];
};

// 一个最小可用的 agent 完整骨架（注释双语）。第 3 站你会亲手写出它。
export const agentCode: { zh: string[]; en: string[] } = {
  zh: [
    'import Anthropic from "@anthropic-ai/sdk";',
    'const client = new Anthropic(); // API key 读自环境变量，绝不写进代码',
    '',
    '// ① 一个数组：agent 的全部“记忆”就是它',
    'const messages = [];',
    '',
    '// 你的任务，成为数组的第一个元素',
    'messages.push({ role: "user", content: task });',
    '',
    '// ② 一个循环',
    'while (true) {',
    '  // 把“整个数组”原样发给模型（每一轮都全量重发）',
    '  const res = await client.messages.create({',
    '    model: "claude-sonnet-5",',
    '    max_tokens: 4096, // 单次回复的长度上限：必填参数，漏了直接 400',
    '    system: "你是一个本地文件助手……", // system 提示词：单独参数',
    '    tools, // 工具说明书：告诉模型它可以“点”哪些菜',
    '    messages, // ← 数组本体',
    '  });',
    '',
    '  // 模型的回复，原样放回数组',
    '  messages.push({ role: "assistant", content: res.content });',
    '',
    '  // 回复里没有工具请求？任务完成，跳出循环',
    '  if (res.stop_reason !== "tool_use") break;',
    '',
    '  // 有工具请求 → 在你的电脑上执行（模型没有手）',
    '  const results = await runTools(res.content);',
    '',
    '  // 执行结果放回数组，回到循环开头',
    '  messages.push({ role: "user", content: results });',
    '}',
  ],
  en: [
    'import Anthropic from "@anthropic-ai/sdk";',
    'const client = new Anthropic(); // API key comes from an env var — never hardcode it',
    '',
    "// ① An array: the agent's entire memory",
    'const messages = [];',
    '',
    "// Your task becomes the array's first element",
    'messages.push({ role: "user", content: task });',
    '',
    '// ② A loop',
    'while (true) {',
    '  // Send the ENTIRE array to the model (resent in full, every round)',
    '  const res = await client.messages.create({',
    '    model: "claude-sonnet-5",',
    '    max_tokens: 4096, // max length of one reply: required, omitting it returns 400',
    '    system: "You are a local file assistant…", // system prompt: a separate param',
    '    tools, // the tool menu: what the model may order',
    '    messages, // ← the array itself',
    '  });',
    '',
    "  // Push the model's reply back into the array, as-is",
    '  messages.push({ role: "assistant", content: res.content });',
    '',
    '  // No tool request in the reply? The task is done — exit',
    '  if (res.stop_reason !== "tool_use") break;',
    '',
    '  // Tool requested → run it on YOUR machine (the model has no hands)',
    '  const results = await runTools(res.content);',
    '',
    '  // Push results back into the array, loop again',
    '  messages.push({ role: "user", content: results });',
    '}',
  ],
};

export const steps: Step[] = [
  {
    title: {
      zh: '一切从一个空数组开始',
      en: 'Everything starts with an empty array',
    },
    narration: {
      zh:
        '右边这块面板是“X 光片”：它显示的是将要发给 [[api:Claude API]] 的真实数据，而不是给人看的界面。' +
        '现在[[array:数组]]还是空的——agent 还什么都没发生。最上面那条 system 提示词是给模型的“岗位说明书”' +
        '（你是谁、能用什么工具、要守什么规矩），它在代码里是一个单独的参数，每一轮都会随请求一起发出。' +
        '记住这个画面：接下来发生的一切，本质上都只是往这个数组里追加元素。',
      en:
        'The panel on the right is an X-ray: it shows the actual data that will be sent to the [[api:Claude API]], not a UI for humans. ' +
        'Right now the [[array:array]] is empty — nothing has happened yet. The system prompt at the top is the model’s “job description” ' +
        '(who it is, which tools it may use, which rules to follow); in code it is a separate parameter, sent along with every request. ' +
        'Remember this picture: everything that follows is, at its core, just appending elements to this array.',
    },
    faq: {
      q: {
        zh: '为什么说“数组”这么重要？',
        en: 'Why is this “array” such a big deal?',
      },
      a: {
        zh: 'API 本身没有任何记忆，你每次调用它都像是第一次见面。所谓“对话”“上下文”“记忆”，全部就是这个数组本身——你把完整历史随身带着，每次都整个递给模型看。理解了这一点，agent 就没有神秘感了。',
        en: 'The API itself has zero memory — every call is like meeting for the first time. “Conversation”, “context”, “memory” — they are all literally this array: you carry the full history with you and hand the whole thing over every single time. Once you get this, agents stop being mysterious.',
      },
    },
    msgs: [
      {
        tag: 'system',
        body: {
          zh: '你是一个本地文件助手，可以用工具查看目录和读取文件。',
          en: 'You are a local file assistant; you can list directories and read files with tools.',
        },
        sys: true,
      },
    ],
    round: 0,
    tokens: 0,
    focus: [
      [1, 2],
      [4, 5],
    ],
  },
  {
    action: { zh: '发送任务', en: 'Send the task' },
    title: {
      zh: '你的话，变成数组的第一个元素',
      en: 'Your words become the array’s first element',
    },
    narration: {
      zh:
        '你在聊天框里打的字，落到代码里就是一次 [[push:push]]：把 { role: "user", content: "……" } 这个[[object:对象]]追加进数组。' +
        '注意一个关键细节：此刻还没有任何东西发给模型——它对你的任务一无所知。' +
        '“把消息放进数组”和“把数组发给模型”是两个独立的动作，很多人以为发消息就等于模型收到了，其实中间还差一步。',
      en:
        'What you type in the chat box becomes, in code, one [[push:push]]: append the [[object:object]] { role: "user", content: "…" } to the array. ' +
        'Note the key detail: nothing has been sent to the model yet — it knows nothing about your task. ' +
        '“Putting a message into the array” and “sending the array to the model” are two separate actions; there is one more step in between.',
    },
    faq: {
      q: { zh: 'role 是什么？有几种？', en: 'What is role? How many are there?' },
      a: {
        zh: '数组里每个元素都有两个字段：role（谁说的）和 content（说了什么）。role 只有两种会出现在数组里：user（发给模型看的）和 assistant（模型说的）。没有“工具”这个角色——待会你会看到工具结果也是装在 user 消息里的。',
        en: 'Every element has two fields: role (who said it) and content (what was said). Only two roles ever appear in the array: user (things shown TO the model) and assistant (things the model said). There is no “tool” role — soon you will see tool results also ride inside user messages.',
      },
    },
    chat: [
      {
        kind: 'user',
        text: {
          zh: '看看这个文件夹里有什么，告诉我这个项目是干嘛的',
          en: 'Look around this folder and tell me what this project is',
        },
      },
    ],
    msgs: [
      {
        tag: 'user',
        body: {
          zh: '看看这个文件夹里有什么，告诉我这个项目是干嘛的',
          en: 'Look around this folder and tell me what this project is',
        },
      },
    ],
    focus: [[7, 8]],
  },
  {
    action: {
      zh: '把整个数组发给模型（第 1 轮）',
      en: 'Send the whole array to the model (round 1)',
    },
    title: {
      zh: '第 1 轮：模型开口“点菜”了',
      en: 'Round 1: the model places an order',
    },
    narration: {
      zh:
        '现在，整个数组连同 system、tools 参数一起打包发给了 [[api:API]]。模型读完之后没有直接回答，' +
        '而是回复了一个 tool_use 块——意思是“请帮我跑一下 ls”。划重点：模型只是“说”它想用工具，' +
        '它没有手，什么都执行不了。stop_reason: tool_use 翻译成人话就是“该你了”。' +
        '这条回复也被原样 push 进数组，成为一条 assistant 消息。',
      en:
        'Now the entire array — plus the system and tools parameters — is shipped to the [[api:API]]. The model read it and did not answer directly; ' +
        'instead it replied with a tool_use block: “please run ls for me”. Key point: the model only SAYS it wants a tool. ' +
        'It has no hands and can execute nothing. stop_reason: tool_use translates to “your turn”. ' +
        'This reply, too, is pushed into the array verbatim, as an assistant message.',
    },
    faq: {
      q: {
        zh: '模型怎么知道有哪些工具可以用？',
        en: 'How does the model know which tools exist?',
      },
      a: {
        zh: '靠 create 调用里的 tools 参数：你把每个工具的名字、用途、参数格式写成“说明书”发给它。模型看着说明书点菜，做菜的永远是你的代码。你不给说明书，它就一个工具都不知道。',
        en: 'From the tools parameter in the create call: you write each tool’s name, purpose and parameter format into a “menu” and send it over. The model orders from the menu; the kitchen is always your code. No menu, no tools.',
      },
    },
    chat: [
      {
        kind: 'assistant',
        text: {
          zh: '我先看看目录里有什么。',
          en: 'Let me see what’s in the directory first.',
        },
      },
      { kind: 'tool_call', name: 'run_command', arg: 'ls' },
    ],
    msgs: [
      {
        tag: 'assistant · tool_use',
        body: n('{ "name": "run_command", "input": { "command": "ls" } }'),
        mono: true,
        color: 'purple',
      },
    ],
    round: 1,
    stopReason: 'tool_use',
    tokens: 486,
    focus: [
      [11, 19],
      [21, 22],
    ],
  },
  {
    action: { zh: '执行工具：ls', en: 'Run the tool: ls' },
    title: {
      zh: '执行，发生在你的电脑上',
      en: 'Execution happens on YOUR machine',
    },
    narration: {
      zh:
        '你的代码先检查 stop_reason——是 tool_use，所以不跳出循环，而是真正跑了一次 ls。' +
        '这一步 100% 发生在本地：模型碰不到你的文件系统，它甚至不知道命令到底跑没跑。' +
        '跑完后，输出被包成 tool_result，作为一条 user 消息 push 进数组。' +
        '对模型来说，工具结果和你打的字没有本质区别——都只是“别人发来给它看的文字”。',
      en:
        'Your code checks stop_reason — it is tool_use, so instead of exiting the loop it actually runs ls. ' +
        'This step happens 100% locally: the model cannot touch your file system and does not even know whether the command really ran. ' +
        'When it finishes, the output is wrapped as a tool_result and pushed into the array as a user message. ' +
        'To the model, a tool result is no different from anything else it is shown — just text.',
    },
    faq: {
      q: {
        zh: '为什么 tool_result 的 role 是 user，而不是 tool？',
        en: 'Why is the tool_result’s role user, not tool?',
      },
      a: {
        zh: 'Claude API 的 messages 里只有 user 和 assistant 两种角色。判断标准很简单：凡是“发给模型看的”都算 user——你打的字是，工具执行结果也是。模型说的才是 assistant。',
        en: 'The Claude API’s messages have only two roles. The rule is simple: anything shown TO the model is user — the words you type are, and so are tool results. Only what the model says is assistant.',
      },
    },
    chat: [
      {
        kind: 'tool_output',
        text: 'app/  components/  lib/  package.json  README.md',
      },
    ],
    msgs: [
      {
        tag: 'user · tool_result',
        body: n('app/  components/  lib/  package.json  README.md'),
        mono: true,
        color: 'teal',
      },
    ],
    focus: [
      [24, 25],
      [27, 28],
      [30, 31],
    ],
  },
  {
    action: {
      zh: '把结果发回模型（第 2 轮）',
      en: 'Send the result back (round 2)',
    },
    title: {
      zh: '第 2 轮：同样的节拍，更长的数组',
      en: 'Round 2: the same beat, a longer array',
    },
    narration: {
      zh:
        '循环回到开头，再次执行同一行 create——把此刻已经变长的整个数组，从头到尾重新发一遍。' +
        'API 是[[stateless:无状态]]的：它完全不记得上一轮聊过什么，所谓“记忆”就是你每次都把完整历史带在身上。' +
        '模型这次读到了 ls 的结果，发现有个 package.json，决定读一下——于是又一个 tool_use。' +
        '留意右下角的 [[token:token]] 数：数组越长，每一轮就越贵。',
      en:
        'The loop returns to the top and runs the exact same create line — resending the now-longer array from the very beginning. ' +
        'The API is [[stateless:stateless]]: it remembers nothing from last round; “memory” just means you carry the full history every time. ' +
        'This round the model reads the ls result, spots package.json, and decides to read it — another tool_use. ' +
        'Watch the [[token:token]] count: the longer the array, the more each round costs.',
    },
    faq: {
      q: {
        zh: '每次都全量重发，不是很浪费吗？',
        en: 'Isn’t resending everything wasteful?',
      },
      a: {
        zh: '是的，这正是 agent 越跑越贵的原因。真实系统会用 prompt 缓存（重复的前缀打折）等手段降低成本，但“每轮全量重发”这个基本模型不变。看懂了这一点，你也就看懂了为什么长对话又慢又贵。',
        en: 'Yes — this is exactly why agents get more expensive the longer they run. Real systems soften it with prompt caching (repeated prefixes are discounted), but the fundamental model — full resend every round — does not change. Understand this and you understand why long conversations get slow and pricey.',
      },
    },
    chat: [
      {
        kind: 'assistant',
        text: {
          zh: '有 package.json，读一下就知道这个项目是干嘛的了。',
          en: 'There’s a package.json — reading it will tell us what this project is.',
        },
      },
      { kind: 'tool_call', name: 'read_file', arg: 'package.json' },
    ],
    msgs: [
      {
        tag: 'assistant · tool_use',
        body: n('{ "name": "read_file", "input": { "path": "package.json" } }'),
        mono: true,
        color: 'purple',
      },
    ],
    round: 2,
    stopReason: 'tool_use',
    tokens: 1120,
    focus: [
      [11, 19],
      [21, 22],
    ],
  },
  {
    action: { zh: '执行工具：read_file', en: 'Run the tool: read_file' },
    title: {
      zh: '同样的两拍，第二次',
      en: 'The same two beats, a second time',
    },
    narration: {
      zh:
        '又是一模一样的流程：本地执行 → 结果包成 tool_result → push 进数组。' +
        '你应该已经看出规律了：agent 没有魔法，只是在机械地重复“发数组 → 看要不要工具 → 执行 → 塞回数组”这一个节奏。' +
        '写成代码，这个规律就是那个 while (true)——代码面板里被点亮的，始终是同样的几行。',
      en:
        'The identical routine again: run locally → wrap as tool_result → push into the array. ' +
        'You have probably spotted the pattern: an agent has no magic. It mechanically repeats “send array → tool wanted? → execute → push back”. ' +
        'In code, that pattern IS the while (true) — notice the highlighted lines below are the same ones as before.',
    },
    faq: {
      q: {
        zh: '如果工具执行报错了怎么办？',
        en: 'What if a tool errors out?',
      },
      a: {
        zh: '把错误信息原样塞进 tool_result 发回去就行。模型看到报错会自己调整——换个参数重试，或者换一种办法。这就是 agent “会自我修正”的全部原理：它每一轮都能看到上一步的真实结果，包括失败。',
        en: 'Push the error message into a tool_result exactly as-is. The model reads the error and adapts — retries with different arguments, or takes another route. That is the entire secret of agents “self-correcting”: every round it sees the true result of the previous step, including failures.',
      },
    },
    chat: [
      {
        kind: 'tool_output',
        text: '{ "name": "agentlab", "scripts": { "dev": "next dev" }, "dependencies": { "next": "15.x", "react": "19.x" } }',
      },
    ],
    msgs: [
      {
        tag: 'user · tool_result',
        body: n('{ "name": "agentlab", "scripts": { … }, "dependencies": { … } }'),
        mono: true,
        color: 'teal',
      },
    ],
    focus: [
      [24, 25],
      [27, 28],
      [30, 31],
    ],
  },
  {
    action: {
      zh: '把结果发回模型（第 3 轮）',
      en: 'Send the result back (round 3)',
    },
    title: {
      zh: '第 3 轮：stop_reason 变了，循环结束',
      en: 'Round 3: stop_reason changes — the loop ends',
    },
    narration: {
      zh:
        '第三次发出整个数组。这一次模型手里的信息够了，直接用文字回答，回复里没有 tool_use 块，' +
        'stop_reason 变成 end_turn——代码里那个 if 条件终于成立，break 跳出循环，agent 运行结束。' +
        '回看全程：一个数组从空长到 6 个元素，一个循环转了 3 圈，中间你替模型跑了 2 次命令。' +
        '这就是 agent 的全部秘密：一个数组 + 一个循环。',
      en:
        'The whole array goes out a third time. This time the model has enough information and answers in plain text — no tool_use block, ' +
        'stop_reason becomes end_turn. The if condition finally fires, break exits the loop, and the run is over. ' +
        'Look back: one array grew from empty to 6 elements, one loop ran 3 rounds, and you ran 2 commands on the model’s behalf. ' +
        'That is the whole secret: one array + one loop.',
    },
    faq: {
      q: {
        zh: '所以我要亲手写的代码，到底有多少？',
        en: 'So how much code do I actually have to write?',
      },
      a: {
        zh: '下面代码面板里的 32 行就是完整骨架，没有省略任何关键步骤。第 3 站你会一个空一个空把它填出来——到时候你会发现，每一行你都已经在这个页面上“按”过一遍了。',
        en: 'The 32 lines in the panel below are the complete skeleton — nothing essential omitted. At the next stop you will fill it in blank by blank; you have already “pressed” every one of these lines on this page.',
      },
    },
    chat: [
      {
        kind: 'assistant',
        text: {
          zh: '这是一个叫 AgentLab 的 Next.js 项目：一个把 AI agent 的运行过程做成可视化教学的网站——你现在看到的这个页面，就是它自己。',
          en: 'This is a Next.js project called AgentLab: a site that visualizes how an AI agent runs — the very page you are looking at is it.',
        },
      },
    ],
    msgs: [
      {
        tag: 'assistant',
        body: {
          zh: '这是一个叫 AgentLab 的 Next.js 项目：一个把 agent 运行过程可视化的教学网站……',
          en: 'This is a Next.js project called AgentLab — a teaching site that visualizes the agent loop…',
        },
      },
    ],
    round: 3,
    stopReason: 'end_turn',
    tokens: 1834,
    focus: [
      [24, 25],
      [32, 32],
    ],
  },
];
