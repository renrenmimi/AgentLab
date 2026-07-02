// 第 1 站「什么是 Agent」的五幕动画：双语文案数据。
// 每幕的画面（动画 JSX）在 app/page.tsx 里按下标对应。

import type { L } from "@/lib/i18n";

export type Scene = {
  action?: L; // 推进到这一幕的按钮文字
  title: L;
  text: L;
};

export const scenes: Scene[] = [
  {
    title: {
      zh: "你已经会编程了（真的）",
      en: "You already know how to code (really)",
    },
    text: {
      zh:
        "只要你写过一次 print(\"hello world\")，你就已经知道编程的全部本质：程序就是写给电脑的指令清单，" +
        "电脑一行一行照着做，仅此而已。接下来用到的每一个新概念——数组、循环、API——都会在用到的那一刻现场教给你；" +
        "正文里带虚线下划线的词，点一下就有解释。除了那一行 print，什么都不需要提前会。",
      en:
        "If you have ever written print(\"hello world\"), you already know the essence of programming: a program is " +
        "a list of instructions for the computer, followed line by line — that is all. Every new idea we use — arrays, " +
        "loops, APIs — will be taught the moment you need it; any dotted-underlined word in the text can be clicked for " +
        "an explanation. Beyond that one line of print, nothing is assumed.",
    },
  },
  {
    action: { zh: "去认识今天的主角", en: "Meet the main character" },
    title: {
      zh: "先认识主角：大语言模型",
      en: "Meet the main character: the large language model",
    },
    text: {
      zh:
        "ChatGPT、Claude 这些 AI 的本体叫“大语言模型”。它的全部能力可以概括成一句话：" +
        "你给它一段文字，它接着生成一段文字。没有魔法，没有意识，除此之外什么都没有。" +
        "看下面的动画：问题进去，回答出来——这就是它会做的唯一一件事。",
      en:
        "The engine behind ChatGPT and Claude is a “large language model”. Its entire skill fits in one sentence: " +
        "you give it text, it continues with more text. No magic, no consciousness — nothing else. " +
        "Watch the animation below: a question goes in, an answer comes out. That is the only thing it ever does.",
    },
  },
  {
    action: { zh: "让它干点真活试试", en: "Ask it to do real work" },
    title: { zh: "但它没有手", en: "But it has no hands" },
    text: {
      zh:
        "一旦你让它“干活”——读你电脑上的文件、查个网页、跑条命令——它就露馅了。" +
        "模型运行在别人的服务器上，你的电脑它一根手指都碰不到：读不了文件、上不了网、敲不了命令。" +
        "只会聊天的 AI，帮不了你干活。这就是“聊天机器人”和“agent”的分水岭。",
      en:
        "The moment you ask it to DO something — read a file on your machine, fetch a web page, run a command — the illusion breaks. " +
        "The model runs on someone else’s server; it cannot touch your computer at all: no files, no internet, no keyboard. " +
        "An AI that can only chat can’t work for you. This is the line between a chatbot and an agent.",
    },
  },
  {
    action: { zh: "给它一双手", en: "Give it hands" },
    title: {
      zh: "解法：把“手”借给它 —— 工具",
      en: "The fix: lend it your hands — tools",
    },
    text: {
      zh:
        "解决办法出奇地简单。你先告诉模型：“我这里有 read_file、run_command 这些工具，你想用就开口。”" +
        "它想用的时候就用文字说出来（这叫 tool_use）；真正去执行的，是你电脑上的代码；" +
        "执行完，你再把结果用文字发回去给它看。记住分工：模型出主意，你的代码出手。",
      en:
        "The solution is surprisingly simple. First you tell the model: “I have tools here — read_file, run_command — just ask.” " +
        "When it wants one, it says so in text (that’s a tool_use); the code on YOUR machine does the actual work; " +
        "then you send the result back as text for it to read. Remember the division of labor: the model decides, your code acts.",
    },
  },
  {
    action: { zh: "把流程包成循环", en: "Wrap it in a loop" },
    title: {
      zh: "再加一个循环，它就“活”了",
      en: "Add a loop, and it comes alive",
    },
    text: {
      zh:
        "把刚才的过程包进一个循环：发给模型 → 它要工具就执行、结果塞回去 → 再发给模型……" +
        "一圈一圈转，直到它说“做完了”为止。你不用规定转几圈——什么时候用工具、用几次、什么时候收工，" +
        "全由模型自己决定。这个会自己转、自己干活的东西，就叫 agent。盯着下面转两圈，节奏就是这四拍。",
      en:
        "Wrap that exchange in a loop: send to the model → if it wants a tool, run it and push the result back → send again… " +
        "round after round, until it says “done”. You never set the number of rounds — when to use tools, how often, when to stop: " +
        "the model decides. This self-spinning, self-working thing is called an agent. Watch it go around — the rhythm is these four beats.",
    },
  },
  {
    action: { zh: "揭晓答案", en: "Reveal the answer" },
    title: {
      zh: "Agent = 一个数组 + 一个循环",
      en: "Agent = one array + one loop",
    },
    text: {
      zh:
        "所有对话历史（你的话、模型的话、工具结果）都存在一个[[array:数组]]里；一个循环不停地“发数组 → 执行工具 → 塞回结果”。" +
        "Claude Code、Cursor 这些看起来很神的工具，内核都是这个东西的放大版。" +
        "接下来两站：先去看它慢动作跑一遍（每一步都透视给你看），然后你亲手把它写出来。",
      en:
        "The whole conversation history (your words, the model’s words, tool results) lives in one [[array:array]]; " +
        "one loop keeps doing “send array → run tools → push results back”. Claude Code, Cursor — the impressive tools are " +
        "scaled-up versions of exactly this. Two stops left: watch it run in slow motion, then write it yourself.",
    },
  },
];

// 舞台（动画画面）里的文字
export const stage = {
  s0cap: {
    zh: "程序 = 写给电脑的指令清单，电脑一行一行照做。",
    en: "A program = a list of instructions; the computer follows them line by line.",
  },
  s1q: { zh: "天空为什么是蓝的？", en: "Why is the sky blue?" },
  s1a: {
    zh: "因为大气把阳光里的蓝光散射得到处都是……",
    en: "Because the atmosphere scatters the blue in sunlight everywhere…",
  },
  s1cap: {
    zh: "文字进 → 文字出。它会做的，只有这一件事。",
    en: "Text in → text out. That is the only thing it does.",
  },
  brain: { zh: "模型", en: "model" },
  s2q: {
    zh: "帮我看看 package.json 里写了什么？",
    en: "Can you check what’s in my package.json?",
  },
  s2a: {
    zh: "做不到……我碰不到你的电脑 🙅",
    en: "I can’t… I can’t touch your computer 🙅",
  },
  s2cap: {
    zh: "读文件 ✗ 上网 ✗ 敲命令 ✗ —— 它没有手。",
    en: "Files ✗ internet ✗ commands ✗ — it has no hands.",
  },
  actor1: { zh: "模型", en: "model" },
  actor1sub: { zh: "负责决定", en: "decides" },
  actor2: { zh: "你的代码", en: "your code" },
  actor2sub: { zh: "负责执行", en: "executes" },
  s3cap: {
    zh: "模型用文字“点单”→ 你的代码执行 → 结果发回去给它看。就这两拍。",
    en: "The model orders in text → your code executes → the result goes back for it to read. Two beats.",
  },
  n1: { zh: "① 把整个数组发给模型", en: "① Send the whole array to the model" },
  n2: { zh: "② 模型回复", en: "② The model replies" },
  n3: { zh: "③ 你执行工具", en: "③ You run the tool" },
  n4: { zh: "④ 结果塞回数组", en: "④ Push the result into the array" },
  exit: {
    zh: "回复里没有工具请求？→ ✅ 结束",
    en: "No tool request in the reply? → ✅ done",
  },
  arr: { zh: "[ 数组 ]", en: "[ array ]" },
  loopWord: { zh: "循环", en: "loop" },
  s5cap: {
    zh: "记忆全在数组里，节奏全靠循环转。这就是全部秘密。",
    en: "All memory lives in the array; all rhythm comes from the loop. That is the whole secret.",
  },
};
