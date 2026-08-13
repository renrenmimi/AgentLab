// 第 3 站「亲手写一个」的数据（双语）：
// codeTemplate 里的 {{n}} 是要学习者亲手填的空；
// blanks[n] 描述每个空的问题、正确答案、以及**答错时的针对性纠错**。
// 答案比对前会做宽松归一化（去空格、全角转半角、单引号转双引号、转小写等），
// 所以 wrong 里的 test 匹配的是归一化后的小写字符串。

import type { L } from "@/lib/i18n";

export type WrongHint = {
  test: RegExp; // 匹配学习者的（归一化后的）错误输入
  hint: L; // 针对这个错误的纠错讲解
};

export type Blank = {
  lesson?: L; // 🎒 新知识：这个空需要的概念，先教后问（小白语言）
  q: L; // 向学习者提出的问题
  placeholder: L; // 输入框占位提示
  answers: string[]; // 归一化后可接受的答案
  display: string; // 填对后嵌进代码里的规范写法
  hint: L; // 「要提示」按钮给出的提示，也是兜底纠错
  explain: L; // 答对后的一句巩固
  wrong?: WrongHint[];
};

export const codeTemplate: { zh: string[]; en: string[] } = {
  zh: [
    'import Anthropic from "@anthropic-ai/sdk";',
    'const client = new Anthropic();',
    '',
    '// ① 一个数组：agent 的全部“记忆”',
    'const messages = {{0}};',
    '',
    '// 你的任务，放进数组',
    'messages.push({ role: {{1}}, content: "看看这个文件夹里有什么" });',
    '',
    '// ② 一个循环',
    'while ({{2}}) {',
    '  // 把整个数组发给模型',
    '  const res = await client.messages.create({',
    '    model: "claude-sonnet-5",',
    '    max_tokens: 4096,',
    '    system: "你是一个本地文件助手",',
    '    tools,',
    '    {{3}},',
    '  });',
    '',
    '  // 模型的回复，原样放回数组',
    '  messages.push({ role: "assistant", content: {{4}} });',
    '',
    '  // 模型没有再要工具？任务完成',
    '  if (res.stop_reason !== {{5}}) {{6}};',
    '',
    '  // 有工具请求 → 你来执行（模型没有手）',
    '  const results = await runTools(res.content);',
    '',
    '  // 结果放回数组，进入下一轮',
    '  messages.push({ role: {{7}}, content: results });',
    '}',
  ],
  en: [
    'import Anthropic from "@anthropic-ai/sdk";',
    'const client = new Anthropic();',
    '',
    "// ① An array: the agent's entire memory",
    'const messages = {{0}};',
    '',
    '// Your task goes into the array',
    'messages.push({ role: {{1}}, content: "look around this folder" });',
    '',
    '// ② A loop',
    'while ({{2}}) {',
    '  // Send the whole array to the model',
    '  const res = await client.messages.create({',
    '    model: "claude-sonnet-5",',
    '    max_tokens: 4096,',
    '    system: "You are a local file assistant",',
    '    tools,',
    '    {{3}},',
    '  });',
    '',
    "  // Push the model's reply back into the array",
    '  messages.push({ role: "assistant", content: {{4}} });',
    '',
    '  // No more tool requests? The task is done',
    '  if (res.stop_reason !== {{5}}) {{6}};',
    '',
    '  // Tool requested → you run it (the model has no hands)',
    '  const results = await runTools(res.content);',
    '',
    '  // Push results back, next round',
    '  messages.push({ role: {{7}}, content: results });',
    '}',
  ],
};

export const blanks: Blank[] = [
  {
    lesson: {
      zh: '数组（array）＝一排带编号的格子，可以一直往后加新格子。写法用方括号：["苹果", "香蕉"] 是两格，[] 是空的——一格都还没有。我们的 agent 要用一个数组来当“记忆”。',
      en: 'An array = a row of numbered slots you can keep appending to. Square brackets: ["apple", "banana"] has two slots; [] is empty — no slots yet. Our agent uses one array as its memory.',
    },
    q: {
      zh: 'agent 的“记忆”要从空开始。空数组怎么写？',
      en: 'The agent’s “memory” starts empty. How do you write an empty array?',
    },
    placeholder: { zh: '两个字符', en: 'two characters' },
    answers: ['[]'],
    display: '[]',
    hint: {
      zh: '数组用方括号。一对空的方括号，就是一个空数组。',
      en: 'Arrays use square brackets. A pair of empty square brackets is an empty array.',
    },
    explain: {
      zh: '对！这个数组就是 agent 的全部记忆，接下来所有事都是往里追加元素。',
      en: 'Correct! This array is the agent’s entire memory — everything that follows just appends to it.',
    },
    wrong: [
      {
        test: /\{\}/,
        hint: {
          zh: '{ } 是“对象”（一堆键值对）。我们要的是有顺序、能一条条往后加的列表——数组，用方括号 [ ]。',
          en: '{ } is an object (key-value pairs). We need an ordered list we can append to — an array, written with square brackets [ ].',
        },
      },
      {
        test: /"/,
        hint: {
          zh: '不用引号——加了引号就变成字符串（一段文字）了。直接写一对方括号。',
          en: 'No quotes — quotes would make it a string (text). Just write the bare brackets.',
        },
      },
    ],
  },
  {
    lesson: {
      zh: '对象（object）＝带标签的小盒子，写法 { 标签: 内容 }。一条消息就是一个对象：role 标签记“谁说的”，content 标签记“说了什么”。文字（字符串）要加引号，比如 "hello"。',
      en: 'An object = a labeled box: { label: value }. One message is one object: the role label says who spoke, the content label says what was said. Text (a string) needs quotes, like "hello".',
    },
    q: {
      zh: '第一条消息是你布置的任务。role（谁说的）该填什么？',
      en: 'The first message is the task YOU give it. What goes in role?',
    },
    placeholder: { zh: '"？？"', en: '"??"' },
    answers: ['"user"', 'user'],
    display: '"user"',
    hint: {
      zh: '会进数组的角色只有两种：user（发给模型看的）和 assistant（模型说的）。任务是你说的。',
      en: 'Only two roles ever enter the array: user (shown to the model) and assistant (said by the model). The task is said by you.',
    },
    explain: {
      zh: '对！你说的话 role 都是 "user"。记住这个词，最后一个空还会考它。',
      en: 'Right! Everything you say has role "user". Remember this word — the last blank will test it again.',
    },
    wrong: [
      {
        test: /system/,
        hint: {
          zh: 'system 是“岗位说明书”，而且它是 create 的单独参数，根本不进数组。你布置的任务，角色是 user。',
          en: 'system is the job description — and it is a separate parameter of create; it never enters the array. Your task’s role is user.',
        },
      },
      {
        test: /assistant/,
        hint: {
          zh: 'assistant 是模型说的话。这句任务是你说的——所以是 user。',
          en: 'assistant is what the MODEL says. This line is you speaking — so it is user.',
        },
      },
      {
        test: /human|me|我/,
        hint: {
          zh: '意思对了！但 API 认的写法是 user（用户）。',
          en: 'Right idea! But the API spells it user.',
        },
      },
    ],
  },
  {
    lesson: {
      zh: '循环（loop）＝让电脑重复做事。while (条件) { …… } 的意思是：只要括号里的条件成立，就把花括号里的事从头再做一遍。条件是个布尔值——只有 true（真）和 false（假）两种。',
      en: 'A loop = making the computer repeat something. while (condition) { … } means: as long as the condition holds, do the braces again from the top. The condition is a boolean — only true or false.',
    },
    q: {
      zh: '任务要转几圈才做完，事先没人知道。while 的条件填什么，能让循环一直转？',
      en: 'Nobody knows in advance how many rounds a task needs. What condition keeps the while loop spinning forever?',
    },
    placeholder: { zh: '一个关键字', en: 'one keyword' },
    answers: ['true'],
    display: 'true',
    hint: {
      zh: '让条件永远成立就行——布尔值里表示“真”的那个词。出口交给循环体里的 break。',
      en: 'Make the condition always hold — the boolean word for “yes”. The exit is the break inside the loop.',
    },
    explain: {
      zh: '对！while (true) 就是“无限转”。转几圈由模型决定，够了就 break 出去。',
      en: 'Right! while (true) means “spin forever”. The model decides how many rounds; break gets us out.',
    },
    wrong: [
      {
        test: /^\d+$/,
        hint: {
          zh: '写死数字就不是循环条件了（而且 agent 的圈数不该写死——简单任务 1 圈、复杂任务 20 圈，都由模型决定）。要一个永远为“真”的条件。',
          en: 'A hardcoded number breaks the whole idea — a simple task needs 1 round, a complex one 20, and the model decides. You want a condition that is always true.',
        },
      },
      {
        test: /messages|res/,
        hint: {
          zh: '思路可以理解，但这里不需要检查任何东西——让它无限转，靠下面的 break 跳出。填那个表示“真”的布尔值。',
          en: 'Understandable instinct, but nothing needs checking here — let it spin forever and exit via break below. Fill in the boolean that means “true”.',
        },
      },
    ],
  },
  {
    lesson: {
      zh: '变量（variable）＝给东西起的名字。第 5 行我们把那个数组命名为 messages；之后在任何地方写 messages，指的都是同一个数组。',
      en: 'A variable = a name you give something. On line 5 we named our array messages; writing messages anywhere afterwards refers to that same array.',
    },
    q: {
      zh: 'create 的参数里最关键的一个：每一轮要把什么发给模型？',
      en: 'The most important parameter of create: what do we send the model every round?',
    },
    placeholder: { zh: '一个变量名', en: 'a variable name' },
    answers: ['messages'],
    display: 'messages',
    hint: {
      zh: '就是第 5 行定义的那个数组的名字。每轮发的都是它的全部内容。',
      en: 'The name of the array defined on line 5. Every round sends all of it.',
    },
    explain: {
      zh: '对！每一轮都是把整个 messages 数组全量重发——API 没有记忆，记忆就是这个数组。',
      en: 'Right! Every round resends the entire messages array — the API has no memory; the memory IS the array.',
    },
    wrong: [
      {
        test: /\[/,
        hint: {
          zh: '不是只发最后一条！API 完全没有记忆，每一轮都要把完整历史从头发一遍。直接写数组的名字。',
          en: 'Not just the last item! The API remembers nothing — every round must resend the full history from the start. Just write the array’s name.',
        },
      },
      {
        test: /^(message|msg|msgs)$/,
        hint: {
          zh: '就差一点——变量名要和第 5 行定义的一模一样：messages（复数）。',
          en: 'So close — it must match line 5 exactly: messages (plural).',
        },
      },
      {
        test: /res|task/,
        hint: {
          zh: '要发的是“到目前为止的全部对话历史”，也就是我们那个数组。它叫什么名字？',
          en: 'We send “the whole conversation so far” — that array up top. What is its name?',
        },
      },
    ],
  },
  {
    lesson: {
      zh: '点号（.）＝打开盒子拿东西。模型寄回来的包裹叫 res，里面分格放着好几样东西；res.content 的意思就是“res 里面 content 那一格”。',
      en: 'The dot (.) = reaching into a box. The parcel the model sends back is called res, with several compartments inside; res.content means “the content compartment of res”.',
    },
    q: {
      zh: '模型的回复装在 res 里。要放回数组的是回复的“内容”，怎么写？',
      en: 'The model’s reply lives in res. We push the reply’s CONTENT into the array — how do you write that?',
    },
    placeholder: { zh: '？？.？？', en: '??.??' },
    answers: ['res.content'],
    display: 'res.content',
    hint: {
      zh: '用点号从 res 里取出 content 字段：res.content。',
      en: 'Use a dot to take the content field out of res: res.content.',
    },
    explain: {
      zh: '对！res 里还有 stop_reason 等元数据，进数组的只有内容本身。',
      en: 'Right! res also carries stop_reason and usage metadata — only the content itself goes into the array.',
    },
    wrong: [
      {
        test: /^res$/,
        hint: {
          zh: '整个 res 还包着 stop_reason、token 用量这些元数据。只把内容放进数组——从 res 里取 content 字段。',
          en: 'The whole res is wrapped in metadata — stop_reason, token usage. Only the content goes in: take the content field from res.',
        },
      },
      {
        test: /^content$/,
        hint: {
          zh: 'content 是 res 里面的一个字段，得写清楚它是谁的：res.content。',
          en: 'content is a field OF res — spell out whose it is: res.content.',
        },
      },
      {
        test: /text|message/,
        hint: {
          zh: 'Claude API 里回复内容的字段名叫 content。从 res 里取它。',
          en: 'In the Claude API the reply’s field is called content. Take it from res.',
        },
      },
    ],
  },
  {
    lesson: {
      zh: '!== 的意思是“不等于”。这一行在问：模型这次的回复，不是在要工具吗？要比较的值是一段文字（字符串），所以带引号。',
      en: '!== means “not equal to”. This line asks: is the model’s reply NOT a tool request? The value being compared is text (a string), so it takes quotes.',
    },
    q: {
      zh: '模型“还想用工具”的时候，stop_reason 的值是什么？',
      en: 'When the model still wants a tool, what is the value of stop_reason?',
    },
    placeholder: { zh: '"？？"', en: '"??"' },
    answers: ['"tool_use"', 'tool_use'],
    display: '"tool_use"',
    hint: {
      zh: '第 2 站透视面板里，琥珀色徽标上写的就是它：tool_use（要用工具）。',
      en: 'It is what the amber badge said at Stop 2: tool_use.',
    },
    explain: {
      zh: '对！这行的意思是：只要模型不是在要工具，就说明做完了，跳出循环。',
      en: 'Right! This line reads: as long as the model is not asking for a tool, we are done — exit the loop.',
    },
    wrong: [
      {
        test: /end_turn/,
        hint: {
          zh: '方向反了：end_turn 是“说完了、收工”。这里要填的是“还想用工具”时的值——tool_use。（条件是 !==，即“不是在要工具就退出”。）',
          en: 'Backwards: end_turn means “I’m done talking”. This blank is the value while it STILL wants a tool — tool_use. (The condition is !==: “if NOT asking for a tool, exit”.)',
        },
      },
      {
        test: /tool(?!_use)/,
        hint: {
          zh: '很接近了！完整的值是 tool_use（用下划线连接）。',
          en: 'Very close! The full value is tool_use (with an underscore).',
        },
      },
    ],
  },
  {
    lesson: {
      zh: 'break ＝ 立刻跳出循环：剩下的圈全都不转了，程序接着往循环外面走。它是 while (true) 这种“无限循环”唯一的出口。',
      en: 'break = leave the loop immediately: no more rounds, the program continues after the loop. It is the only exit from a while (true) “infinite” loop.',
    },
    q: {
      zh: '条件成立（模型没有再要工具）时，用哪个关键字跳出循环？',
      en: 'When the condition fires (no more tool requests), which keyword exits the loop?',
    },
    placeholder: { zh: '一个关键字', en: 'one keyword' },
    answers: ['break'],
    display: 'break',
    hint: {
      zh: 'JavaScript 里跳出循环的关键字，5 个字母。',
      en: 'JavaScript’s loop-exit keyword, 5 letters.',
    },
    explain: {
      zh: '对！break 就是 agent 的“下班打卡”——整个循环唯一的出口。',
      en: 'Right! break is the agent clocking out — the loop’s only exit.',
    },
    wrong: [
      {
        test: /return/,
        hint: {
          zh: 'return 是“从函数返回”。跳出循环的标准写法是 break。',
          en: 'return exits a function. The standard way out of a loop is break.',
        },
      },
      {
        test: /stop|exit|end|quit/,
        hint: {
          zh: '意思对了，但 JavaScript 里没有这个关键字——跳出循环用 break。',
          en: 'Right idea, but that is not a JavaScript keyword — exiting a loop is break.',
        },
      },
      {
        test: /continue/,
        hint: {
          zh: 'continue 是“跳过本圈、继续下一圈”，正好相反。彻底离开循环用 break。',
          en: 'continue means “skip to the next round” — the opposite! Leaving the loop entirely is break.',
        },
      },
    ],
  },
  {
    lesson: {
      zh: '这一空不教新知识——它考的是第 2 站讲过的、最容易踩的那个坑。想想那条唯一的判断标准。',
      en: 'No new concept here — this one tests the classic trap from Stop 2. Think of the one and only rule.',
    },
    q: {
      zh: '最后一空，也是最容易踩的坑：工具结果要发回给模型“看”，role 填什么？',
      en: 'Last blank — and the classic trap: tool results go back for the model to SEE. What is the role?',
    },
    placeholder: { zh: '"？？"', en: '"??"' },
    answers: ['"user"', 'user'],
    display: '"user"',
    hint: {
      zh: '判断标准只有一条：这条消息是“发给模型看的”，还是“模型说的”？',
      en: 'One rule: is this message shown TO the model, or said BY the model?',
    },
    explain: {
      zh: '完全正确！凡是发给模型看的都是 user——你打的字是，工具结果也是。你已经掌握全部要点了。',
      en: 'Perfect! Everything shown to the model is user — your typing is, and so are tool results. You now know all the key moves.',
    },
    wrong: [
      {
        test: /tool/,
        hint: {
          zh: '最经典的错误！Claude API 里没有 tool 这个角色。判断标准：凡是“发给模型看的”都是 user——你打的字是，工具结果也是。',
          en: 'The classic mistake! There is no tool role in the Claude API. The rule: anything shown TO the model is user — your words and tool results alike.',
        },
      },
      {
        test: /assistant/,
        hint: {
          zh: 'assistant 只用于模型自己说的话。工具结果是你替它跑出来、发回去给它看的——发给模型看的都是 user。',
          en: 'assistant is only for what the model itself says. You ran this tool on its behalf and are showing it the result — shown-to-model means user.',
        },
      },
      {
        test: /system|result|function/,
        hint: {
          zh: '数组里只有 user 和 assistant 两种角色。这条消息是发给模型看的，所以是……',
          en: 'Only user and assistant exist in the array. This message is shown to the model, so it is…',
        },
      },
    ],
  },
];

// 全部填对后，「运行」按钮回放的控制台输出
export const runScript: { zh: string[]; en: string[] } = {
  zh: [
    '$ node agent.js',
    '第 1 轮 ▸ 把 messages（1 条消息）发给模型…',
    '      ◂ 模型：我先看看目录里有什么 → tool_use: run_command("ls")',
    '      ⚙ 你的代码执行 ls → app/  lib/  package.json  README.md',
    '      ▸ 结果塞回数组（现在 3 条）',
    '第 2 轮 ▸ 把 messages（3 条）重新发给模型…',
    '      ◂ 模型：读一下 package.json → tool_use: read_file("package.json")',
    '      ⚙ 你的代码执行 read_file → { "name": "agentlab", … }',
    '      ▸ 结果塞回数组（现在 5 条）',
    '第 3 轮 ▸ 把 messages（5 条）重新发给模型…',
    '      ◂ 模型：stop_reason = end_turn ✓（没有再要工具）',
    'break！循环结束。',
    '🤖 最终回答：这是一个叫 AgentLab 的 Next.js 项目——一个把 agent 运行过程可视化的教学网站。',
  ],
  en: [
    '$ node agent.js',
    'Round 1 ▸ sending messages (1 message) to the model…',
    '      ◂ model: let me list the directory → tool_use: run_command("ls")',
    '      ⚙ your code runs ls → app/  lib/  package.json  README.md',
    '      ▸ result pushed into the array (now 3 messages)',
    'Round 2 ▸ resending messages (3) to the model…',
    '      ◂ model: let me read package.json → tool_use: read_file("package.json")',
    '      ⚙ your code runs read_file → { "name": "agentlab", … }',
    '      ▸ result pushed into the array (now 5 messages)',
    'Round 3 ▸ resending messages (5) to the model…',
    '      ◂ model: stop_reason = end_turn ✓ (no more tool requests)',
    'break! The loop ends.',
    '🤖 Final answer: this is a Next.js project called AgentLab — a site that visualizes how an agent runs.',
  ],
};
