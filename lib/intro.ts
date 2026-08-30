//「什么是 Agent」的六幕动画：双语文案数据。
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
      zh: "你已经具备了理解本站所需的全部基础",
      en: "You already have everything you need to start",
    },
    text: {
      zh:
        "只要你写过一次 print(\"hello world\")，你就已经知道编程的全部本质：程序就是写给电脑的指令清单，" +
        "电脑一行一行照着做，仅此而已。接下来用到的每一个新概念——数组、循环、API——都会在用到的那一刻现场教给你；" +
        "正文里带虚线下划线的词，点一下就有解释。除了那一行 print，什么都不需要提前会。",
      en:
        "If you have written print(\"hello world\") once, you already know what a program is: a list of " +
        "instructions for the computer, followed one line at a time. That is all. Every new idea used here — arrays, " +
        "loops, APIs — is explained at the moment you need it, and any word with a dotted underline can be clicked for " +
        "a plain explanation. Beyond that one line of print, nothing is assumed.",
    },
  },
  {
    action: { zh: "先认识大语言模型", en: "Start with the model" },
    title: {
      zh: "第一个概念：大语言模型",
      en: "The first concept: the large language model",
    },
    text: {
      zh:
        "ChatGPT、Claude 背后的核心技术叫“大语言模型”。它的全部能力可以概括成一句话：" +
        "你给它一段文字，它接着生成一段文字。没有魔法，没有意识，除此之外什么都没有。" +
        "看下面的动画：问题进去，回答出来——这就是它会做的唯一一件事。",
      en:
        "The technology behind ChatGPT and Claude is called a large language model. Its entire ability fits in one " +
        "sentence: you give it text, and it produces more text. There is no magic and no consciousness behind it. " +
        "Watch the animation below: a question goes in, an answer comes out. That is the only thing it does.",
    },
  },
  {
    action: { zh: "让它做一件真实的事", en: "Ask it to do real work" },
    title: { zh: "但它没有手", en: "But it has no hands" },
    text: {
      zh:
        "一旦你让它做点实事——读你电脑上的文件、查个网页、跑条命令——这个局限就暴露了。" +
        "模型运行在别人的服务器上，你的电脑它一根手指都碰不到：读不了文件、上不了网、敲不了命令。" +
        "只会生成文字的模型，替你干不了活。这就是“聊天机器人”和“agent”的分水岭。",
      en:
        "The moment you ask it to do something real — read a file on your computer, fetch a web page, run a command — " +
        "the limit shows. The model runs on someone else's server and cannot touch your computer at all: no files, " +
        "no network, no keyboard. A model that only produces text cannot do the work for you. " +
        "This is the line between a chatbot and an agent.",
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
        "解决办法出奇地简单。你先告诉模型有哪些工具可以用：read_file、run_command 等等。" +
        "它需要某个工具时，就返回一段结构化的请求，写明工具名和参数——这叫 tool_use。" +
        "真正执行的是你电脑上的代码；执行完，你再把结果作为一条新消息发回去给它看。" +
        "记住这个分工：模型提出请求，你的代码负责执行。",
      en:
        "The fix is simple. First you tell the model which tools exist: read_file, run_command, and so on. " +
        "When it needs one, it returns a structured request naming the tool and its arguments — this is called a " +
        "tool_use block. The code on your own computer runs the tool. Then you send the result back as a new message " +
        "for the model to read. Remember the split: the model asks, your code acts.",
    },
  },
  {
    action: { zh: "把流程包成循环", en: "Wrap it in a loop" },
    title: {
      zh: "再加一个循环，它就成了 agent",
      en: "Add a loop, and it becomes an agent",
    },
    text: {
      zh:
        "把刚才的过程包进一个循环：把数组发给模型 → 回复里要工具就执行、结果追加进数组 → 再发一次……" +
        "一圈一圈转，直到某一次回复里不再有工具请求为止。你不用事先规定转几圈：只要回复还在要工具，循环就继续。" +
        "这样一个程序——一个循环、一个不断变长的数组、由你的代码执行的工具——就是所谓的 agent。" +
        "看下面的动画转两轮，节奏就是这四步。",
      en:
        "Wrap that exchange in a loop: send the array to the model, run any tool the reply asks for, append the result, " +
        "then send the array again. The loop repeats until a reply comes back with no tool request in it. You never set " +
        "the number of rounds in advance — the loop keeps going as long as the replies keep asking for tools. " +
        "A program built this way is what people call an agent. Watch two rounds go by below; the rhythm is these four steps.",
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
        "所有对话历史（你的话、模型的回复、工具结果）都存在一个[[array:数组]]里；一个循环不停地重复“发数组 → 执行工具 → 追加结果”。" +
        "Claude Code、Cursor 这类工具看起来复杂，内核都是这个东西的放大版。" +
        "接下来两站：先去看它慢动作跑一遍（每一步都透视给你看），然后你亲手把它写出来。",
      en:
        "The whole conversation history — your words, the model's replies, the tool results — lives in one " +
        "[[array:array]]. One loop keeps repeating the same three moves: send the array, run any requested tool, append " +
        "the result. Claude Code and Cursor look complicated, but at the core they are larger versions of exactly this. " +
        "Two stops left: first watch it run in slow motion, then write it yourself.",
    },
  },
];

// 舞台（动画画面）里的文字
export const stage = {
  s0cap: {
    zh: "程序 = 写给电脑的指令清单，电脑一行一行照做。",
    en: "A program = a list of instructions; the computer follows them one line at a time.",
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
    en: "Can you tell me what is in my package.json?",
  },
  s2a: {
    zh: "做不到。你的电脑不在我能接触到的范围里。",
    en: "I cannot. Your computer is not something I can reach.",
  },
  s2cap: {
    zh: "读文件 ✕　上网 ✕　敲命令 ✕　—— 它没有手。",
    en: "Files ✕　network ✕　commands ✕　— it has no hands.",
  },
  actor1: { zh: "模型", en: "model" },
  actor1sub: { zh: "负责提出请求", en: "asks" },
  actor2: { zh: "你的代码", en: "your code" },
  actor2sub: { zh: "负责执行", en: "runs it" },
  s3cap: {
    zh: "模型在回复里提出请求 → 你的代码执行 → 结果作为新消息发回去。就这两步。",
    en: "The model asks in its reply → your code runs the tool → the result goes back as a new message. Two steps.",
  },
  n1: { zh: "① 把整个数组发给模型", en: "① Send the whole array to the model" },
  n2: { zh: "② 模型回复", en: "② The model replies" },
  n3: { zh: "③ 你执行工具", en: "③ You run the tool" },
  n4: { zh: "④ 结果追加到数组", en: "④ Append the result to the array" },
  exit: {
    zh: "回复里没有工具请求？→ ✓ 结束",
    en: "No tool request in the reply? → ✓ done",
  },
  arr: { zh: "[ 数组 ]", en: "[ array ]" },
  loopWord: { zh: "循环", en: "loop" },
  s5cap: {
    zh: "记忆全在数组里，节奏全靠循环转。就是这么两件事。",
    en: "All the memory is in the array. All the rhythm comes from the loop. That is all there is to it.",
  },
};
