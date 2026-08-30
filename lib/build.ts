//「亲手写一个」的数据（双语）：
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
  lesson?: L; // 新知识：这个空需要的概念，先教后问（面向初学者的表述）
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
    '  // 回复里没有再要工具？任务完成',
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
    '  // No tool request in the reply? The task is done',
    '  if (res.stop_reason !== {{5}}) {{6}};',
    '',
    '  // Tool requested → you run it (the model has no hands)',
    '  const results = await runTools(res.content);',
    '',
    '  // Push the result back, next round',
    '  messages.push({ role: {{7}}, content: results });',
    '}',
  ],
};

export const blanks: Blank[] = [
  {
    lesson: {
      zh: '数组（array）＝一排带编号的格子，可以一直往后加新格子。写法用方括号：["苹果", "香蕉"] 是两格，[] 是空的——一格都还没有。我们的 agent 要用一个数组来当“记忆”。',
      en: 'An array = a row of numbered slots that you can keep appending to. It is written with square brackets: ["apple", "banana"] has two slots, and [] is empty — no slots yet. Our agent uses one array as its memory.',
    },
    q: {
      zh: 'agent 的“记忆”要从空开始。空数组怎么写？',
      en: 'The agent memory starts out empty. How do you write an empty array?',
    },
    placeholder: { zh: '两个字符', en: 'two characters' },
    answers: ['[]'],
    display: '[]',
    hint: {
      zh: '数组用方括号。一对空的方括号，就是一个空数组。',
      en: 'Arrays use square brackets. A pair of empty square brackets is an empty array.',
    },
    explain: {
      zh: '对。这个数组就是 agent 的全部记忆，接下来所有事都是往里追加元素。',
      en: 'Correct. This array is the entire memory of the agent, and everything that follows just appends to it.',
    },
    wrong: [
      {
        test: /\{\}/,
        hint: {
          zh: '{ } 是“对象”（一堆键值对）。我们要的是有顺序、能一条条往后加的列表——数组，用方括号 [ ]。',
          en: '{ } is an object, which holds key-value pairs. We need an ordered list that we can append to one item at a time: an array, written with square brackets [ ].',
        },
      },
      {
        test: /"/,
        hint: {
          zh: '不用引号——加了引号就变成字符串（一段文字）了。直接写一对方括号。',
          en: 'No quotes. Quotes would make it a string, which is text. Write the bare brackets.',
        },
      },
    ],
  },
  {
    lesson: {
      zh: '对象（object）＝带标签的小盒子，写法 { 标签: 内容 }。一条消息就是一个对象：role 标签记“谁说的”，content 标签记“说了什么”。文字（字符串）要加引号，比如 "hello"。',
      en: 'An object = a labeled box, written { label: value }. One message is one object: the role label records where it came from, and the content label records what it says. Text (a string) needs quotes, like "hello".',
    },
    q: {
      zh: '第一条消息是你布置的任务。role（谁说的）该填什么？',
      en: 'The first message is the task you give it. What goes in role?',
    },
    placeholder: { zh: '"？？"', en: '"??"' },
    answers: ['"user"', 'user'],
    display: '"user"',
    hint: {
      zh: '会进数组的角色只有两种：user（发给模型看的）和 assistant（模型生成的）。任务是你说的。',
      en: 'Only two roles go into the array: user, for anything shown to the model, and assistant, for anything the model produced. The task comes from you.',
    },
    explain: {
      zh: '对。你说的话 role 都是 "user"。记住这个词，最后一个空还会考它。',
      en: 'Correct. Everything you write has the role "user". Remember this word — the last blank asks for it again.',
    },
    wrong: [
      {
        test: /system/,
        hint: {
          zh: 'system 是“岗位说明书”，而且它是 create 的单独参数，根本不进数组。你布置的任务，角色是 user。',
          en: 'system is the job description, and it is a separate parameter of create — it never enters the array. The task you write has the role user.',
        },
      },
      {
        test: /assistant/,
        hint: {
          zh: 'assistant 是模型生成的内容。这句任务是你写的——所以是 user。',
          en: 'assistant is for what the model produced. This line was written by you, so it is user.',
        },
      },
      {
        test: /human|me|我/,
        hint: {
          zh: '意思对了。API 规定的取值写作 user。',
          en: 'Right idea. The value the API expects is spelled user.',
        },
      },
    ],
  },
  {
    lesson: {
      zh: '循环（loop）＝让电脑重复做事。while (条件) { …… } 的意思是：只要括号里的条件成立，就把花括号里的事从头再做一遍。条件是个布尔值——只有 true（真）和 false（假）两种。',
      en: 'A loop = making the computer repeat something. while (condition) { … } means: as long as the condition holds, run the braces again from the top. The condition is a boolean, which has only two values: true and false.',
    },
    q: {
      zh: '任务要转几圈才做完，事先没人知道。while 的条件填什么，能让循环一直转？',
      en: 'Nobody knows in advance how many rounds a task will need. What condition keeps the while loop running?',
    },
    placeholder: { zh: '一个关键字', en: 'one keyword' },
    answers: ['true'],
    display: 'true',
    hint: {
      zh: '让条件永远成立就行——布尔值里表示“真”的那个词。出口交给循环体里的 break。',
      en: 'Make the condition always hold: the boolean value that is always true. The exit is the break inside the loop.',
    },
    explain: {
      zh: '对。while (true) 就是“无限转”。转几圈取决于模型的回复，够了就 break 出去。',
      en: 'Correct. while (true) never stops on its own. How many rounds it runs depends on the replies, and break is what gets you out.',
    },
    wrong: [
      {
        test: /^\d+$/,
        hint: {
          zh: '写死数字就不是循环条件了，而且 agent 的圈数不该写死——简单任务 1 圈、复杂任务 20 圈，事先没法知道。要一个永远为“真”的条件。',
          en: 'A fixed number will not work here. A simple task may need one round and a complex one twenty, and you cannot know which in advance. You want a condition that is always true.',
        },
      },
      {
        test: /messages|res/,
        hint: {
          zh: '思路可以理解，但这里不需要检查任何东西——让它无限转，靠下面的 break 跳出。填那个表示“真”的布尔值。',
          en: 'Nothing needs checking here. Let the loop run and leave it through the break below. Fill in the boolean value that is always true.',
        },
      },
    ],
  },
  {
    lesson: {
      zh: '变量（variable）＝给东西起的名字。第 5 行我们把那个数组命名为 messages；之后在任何地方写 messages，指的都是同一个数组。',
      en: 'A variable = a name you give something. On line 5 the array was named messages, so writing messages anywhere after that refers to the same array.',
    },
    q: {
      zh: 'create 的参数里最关键的一个：每一轮要把什么发给模型？',
      en: 'The most important parameter of create: what do you send the model every round?',
    },
    placeholder: { zh: '一个变量名', en: 'a variable name' },
    answers: ['messages'],
    display: 'messages',
    hint: {
      zh: '就是第 5 行定义的那个数组的名字。每轮发的都是它的全部内容。',
      en: 'The name of the array defined on line 5. Every round sends all of it.',
    },
    explain: {
      zh: '对。每一轮都是把整个 messages 数组全量重发——API 不保留任何东西，记忆就是这个数组。',
      en: 'Correct. Every round resends the whole messages array. The API keeps no state between calls, so this array is the memory.',
    },
    wrong: [
      {
        test: /\[/,
        hint: {
          zh: '不是只发最后一条。API 不保留上一轮的任何东西，每一轮都要把完整历史从头发一遍。直接写数组的名字。',
          en: 'Not just the last item. The API keeps nothing from the previous round, so every round has to resend the full history from the start. Write the name of the array.',
        },
      },
      {
        test: /^(message|msg|msgs)$/,
        hint: {
          zh: '就差一点——变量名要和第 5 行定义的一模一样：messages（复数）。',
          en: 'Very close. The name has to match line 5 exactly: messages, plural.',
        },
      },
      {
        test: /res|task/,
        hint: {
          zh: '要发的是“到目前为止的全部对话历史”，也就是我们那个数组。它叫什么名字？',
          en: 'What you send is the whole conversation so far, which is the array defined at the top. What is it called?',
        },
      },
    ],
  },
  {
    lesson: {
      zh: '点号（.）＝打开盒子拿东西。模型寄回来的包裹叫 res，里面分格放着好几样东西；res.content 的意思就是“res 里面 content 那一格”。',
      en: 'The dot (.) = reaching into a box. The parcel that comes back is called res, and it has several compartments inside. res.content means the content compartment of res.',
    },
    q: {
      zh: '模型的回复装在 res 里。要放回数组的是回复的“内容”，怎么写？',
      en: 'The reply arrives inside res. What goes into the array is the content of that reply. How do you write it?',
    },
    placeholder: { zh: '？？.？？', en: '??.??' },
    answers: ['res.content'],
    display: 'res.content',
    hint: {
      zh: '用点号从 res 里取出 content 字段：res.content。',
      en: 'Use a dot to take the content field out of res: res.content.',
    },
    explain: {
      zh: '对。res 里还有 stop_reason 等元数据，进数组的只有内容本身。',
      en: 'Correct. res also carries metadata such as stop_reason and token usage. Only the content itself goes into the array.',
    },
    wrong: [
      {
        test: /^res$/,
        hint: {
          zh: '整个 res 还包着 stop_reason、token 用量这些元数据。只把内容放进数组——从 res 里取 content 字段。',
          en: 'The whole res also holds metadata: stop_reason, token usage. Only the content belongs in the array, so take the content field out of res.',
        },
      },
      {
        test: /^content$/,
        hint: {
          zh: 'content 是 res 里面的一个字段，得写清楚它是谁的：res.content。',
          en: 'content is a field of res, so you have to say whose it is: res.content.',
        },
      },
      {
        test: /text|message/,
        hint: {
          zh: 'Claude API 里回复内容的字段名叫 content。从 res 里取它。',
          en: 'In the Claude API the field holding the reply is called content. Take it from res.',
        },
      },
    ],
  },
  {
    lesson: {
      zh: '!== 的意思是“不等于”。这一行在问：模型这次的回复，是不是没有在要工具？要比较的值是一段文字（字符串），所以带引号。',
      en: '!== means "not equal to". This line asks whether the reply is not a tool request. The value being compared is text (a string), so it takes quotes.',
    },
    q: {
      zh: '模型“还想用工具”的时候，stop_reason 的值是什么？',
      en: 'When the reply is asking for a tool, what is the value of stop_reason?',
    },
    placeholder: { zh: '"？？"', en: '"??"' },
    answers: ['"tool_use"', 'tool_use'],
    display: '"tool_use"',
    hint: {
      zh: '[[stop:/loop]]透视面板里，琥珀色徽标上写的就是它：tool_use（要用工具）。',
      en: 'It is the value on the amber badge at [[stop:/loop]]: tool_use.',
    },
    explain: {
      zh: '对。这行的意思是：只要回复里不是在要工具，就说明做完了，跳出循环。',
      en: 'Correct. This line reads: if the reply is not a tool request, the task is done, so leave the loop.',
    },
    wrong: [
      {
        test: /end_turn/,
        hint: {
          zh: '方向反了：end_turn 表示“这一轮说完了，没有工具请求”。这里要填的是“还在要工具”时的值——tool_use。（条件是 !==，意思是“不是在要工具就退出”。）',
          en: 'That is the other value. end_turn means the reply contains no tool request. This blank needs the value that appears while a tool is still being requested: tool_use. The condition is !==, so the loop exits when the reply is not a tool request.',
        },
      },
      {
        test: /tool(?!_use)/,
        hint: {
          zh: '很接近了。完整的值是 tool_use，中间是下划线。',
          en: 'Very close. The full value is tool_use, joined with an underscore.',
        },
      },
    ],
  },
  {
    lesson: {
      zh: 'break ＝ 立刻跳出循环：剩下的圈全都不转了，程序接着往循环外面走。它是 while (true) 这种“无限循环”唯一的出口。',
      en: 'break = leave the loop immediately. No more rounds run, and the program continues after the loop. It is the only exit from a while (true) loop.',
    },
    q: {
      zh: '条件成立（回复里没有再要工具）时，用哪个关键字跳出循环？',
      en: 'When the condition holds (no tool request in the reply), which keyword leaves the loop?',
    },
    placeholder: { zh: '一个关键字', en: 'one keyword' },
    answers: ['break'],
    display: 'break',
    hint: {
      zh: 'JavaScript 里跳出循环的关键字，5 个字母。',
      en: 'The JavaScript keyword for leaving a loop. Five letters.',
    },
    explain: {
      zh: '对。break 是这个无限循环唯一的出口。',
      en: 'Correct. break is the only way out of this infinite loop.',
    },
    wrong: [
      {
        test: /return/,
        hint: {
          zh: 'return 是“从函数返回”。跳出循环的标准写法是 break。',
          en: 'return leaves a function. The standard way to leave a loop is break.',
        },
      },
      {
        test: /stop|exit|end|quit/,
        hint: {
          zh: '意思对了，但 JavaScript 里没有这个关键字——跳出循环用 break。',
          en: 'Right idea, but that is not a JavaScript keyword. Leaving a loop is break.',
        },
      },
      {
        test: /continue/,
        hint: {
          zh: 'continue 是“跳过本圈、继续下一圈”，正好相反。彻底离开循环用 break。',
          en: 'continue skips to the next round of the same loop, which is the opposite of what is wanted here. To leave the loop entirely, use break.',
        },
      },
    ],
  },
  {
    lesson: {
      zh: '这一空不教新知识——它考的是[[stop:/loop]]讲过的、最容易踩的那个坑。想想那条唯一的判断标准。',
      en: 'No new concept here. This blank tests the point people most often get wrong at [[stop:/loop]]. Think of the single rule.',
    },
    q: {
      zh: '最后一空，也是最容易踩的坑：工具结果要发回给模型看，role 填什么？',
      en: 'Last blank, and the one most people get wrong: the tool result is sent back for the model to read. What is the role?',
    },
    placeholder: { zh: '"？？"', en: '"??"' },
    answers: ['"user"', 'user'],
    display: '"user"',
    hint: {
      zh: '判断标准只有一条：这条消息是“发给模型看的”，还是“模型生成的”？',
      en: 'One rule: was this message shown to the model, or produced by the model?',
    },
    explain: {
      zh: '完全正确。凡是发给模型看的都是 user——你打的字是，工具结果也是。到这里，要点你已经全部掌握了。',
      en: 'Exactly right. Anything shown to the model is user: your own words, and tool results too. You now know every key point.',
    },
    wrong: [
      {
        test: /tool/,
        hint: {
          zh: '这是最经典的一个错误。Claude API 里没有 tool 这个角色。判断标准：凡是“发给模型看的”都是 user——你打的字是，工具结果也是。',
          en: 'This is the most common mistake. The Claude API has no tool role. The rule: anything shown to the model is user, your own words and tool results alike.',
        },
      },
      {
        test: /assistant/,
        hint: {
          zh: 'assistant 只用于模型自己生成的内容。工具结果是你替它跑出来、发回去给它看的——发给模型看的都是 user。',
          en: 'assistant is only for what the model itself produced. You ran this tool and are showing it the result, and anything shown to the model is user.',
        },
      },
      {
        test: /system|result|function/,
        hint: {
          zh: '数组里只有 user 和 assistant 两种角色。这条消息是发给模型看的，所以是……',
          en: 'Only user and assistant appear in this array. This message is shown to the model, so it is…',
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
    '      ◂ 回复：我先看看目录里有什么 → tool_use: run_command("ls")',
    '      ⚙ 你的代码执行 ls → app/  lib/  package.json  README.md',
    '      ▸ 结果追加到数组（现在 3 条）',
    '第 2 轮 ▸ 把 messages（3 条）重新发给模型…',
    '      ◂ 回复：读一下 package.json → tool_use: read_file("package.json")',
    '      ⚙ 你的代码执行 read_file → { "name": "agentlab", … }',
    '      ▸ 结果追加到数组（现在 5 条）',
    '第 3 轮 ▸ 把 messages（5 条）重新发给模型…',
    '      ◂ 回复：stop_reason = end_turn ✓（没有工具请求）',
    'break：循环到此结束。',
    '最终回答：这是一个叫 AgentLab 的 Next.js 项目——一个把 agent 运行过程可视化的教学网站。',
  ],
  en: [
    '$ node agent.js',
    'Round 1 ▸ sending messages (1 message) to the model…',
    '      ◂ reply: let me list the directory → tool_use: run_command("ls")',
    '      ⚙ your code runs ls → app/  lib/  package.json  README.md',
    '      ▸ result appended to the array (now 3 messages)',
    'Round 2 ▸ resending messages (3) to the model…',
    '      ◂ reply: let me read package.json → tool_use: read_file("package.json")',
    '      ⚙ your code runs read_file → { "name": "agentlab", … }',
    '      ▸ result appended to the array (now 5 messages)',
    'Round 3 ▸ resending messages (5) to the model…',
    '      ◂ reply: stop_reason = end_turn ✓ (no tool request)',
    'break — the loop ends here.',
    'Final answer: this is a Next.js project called AgentLab — a site that visualizes how an agent runs.',
  ],
};

// 判分前的宽松归一化：全角转半角、去掉空白、单引号统一成双引号、
// 去掉行尾的分号和逗号，最后转小写。答案比对、以及 verify.mjs 的
// 一致性检查，用的都是这一个函数。
const FULL = "（）｛｝［］＂＇；，．！＝＜＞";
const HALF = "(){}[]\"';,.!=<>";

export function normalize(s: string): string {
  let out = s.trim();
  for (let i = 0; i < FULL.length; i++) out = out.split(FULL[i]).join(HALF[i]);
  out = out.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  out = out.replace(/\s+/g, "");
  out = out.replace(/[;,]+$/, "");
  out = out.replace(/'/g, '"');
  return out.toLowerCase();
}
