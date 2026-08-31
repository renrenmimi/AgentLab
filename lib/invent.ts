// 「它为什么会编」：幻觉，以及工具为什么正好是它的解药。

import type { L } from "@/lib/i18n";
import type { Block, LessonMeta } from "@/lib/lesson";

export type Answer = {
  text: L;
  // 这个回答能不能被核对，怎么核对
  checkable: L;
  ok: boolean;
};

export type Question = {
  id: string;
  ask: L;
  // 为什么这个问题的答案不可能在模型里
  why: L;
  without: Answer;
  with: Answer & { via: L };
};

export const questions: Question[] = [
  {
    id: "time",
    ask: { zh: "现在几点？", en: "What time is it?" },
    why: {
      zh: "答案随时在变，而模型是一次训练的结果，训练完成之后世界发生的事它一件都不知道。",
      en: "The answer changes continuously, and the model is the result of one training run: nothing that happened afterwards is in it.",
    },
    without: {
      text: {
        zh: "现在大约是下午三点左右。",
        en: "It is around three in the afternoon.",
      },
      checkable: {
        zh: "没法核对——它没有依据可以给你。这句话的语气和一句正确的回答完全一样。",
        en: "Nothing to check against: there is no source it could show you. The sentence sounds exactly like a correct one.",
      },
      ok: false,
    },
    with: {
      via: { zh: 'now()', en: "now()" },
      text: {
        zh: "2026-08-30 11:42（服务器时区 UTC+8）。",
        en: "2026-08-30 11:42, server timezone UTC+8.",
      },
      checkable: {
        zh: "可以核对：这个值来自一次工具调用，工具返回了什么就写在[[array:数组]]里。",
        en: "Checkable: the value came from a tool call, and what the tool returned is written in the [[array:array]].",
      },
      ok: true,
    },
  },
  {
    id: "framework",
    ask: {
      zh: "这个项目用的是哪个测试框架？",
      en: "Which test framework does this project use?",
    },
    why: {
      zh: "答案在你的仓库里，而你的仓库不在模型的训练数据里。它知道「测试框架」这个概念，不知道你的选择。",
      en: "The answer is in your repository, and your repository was not in the training data. It knows what a test framework is; it does not know which one you picked.",
    },
    without: {
      text: {
        zh: "看起来是 Jest，这类 Next.js 项目通常都用它。",
        en: "It looks like Jest; projects of this shape usually use it.",
      },
      checkable: {
        zh: "「通常」是这句话唯一的依据。它在描述同类项目的常见做法，不是在描述你的项目——而这两件事读起来一模一样。",
        en: "The only thing behind it is usually. It is describing what projects of this shape tend to do rather than what yours does — and the two read identically.",
      },
      ok: false,
    },
    with: {
      via: { zh: 'read_file("package.json")', en: 'read_file("package.json")' },
      text: {
        zh: "vitest（package.json 第 14 行，devDependencies 里）。",
        en: "vitest, at package.json line 14, under devDependencies.",
      },
      checkable: {
        zh: "可以核对，而且核对成本很低：打开那个文件看第 14 行。",
        en: "Checkable, and cheaply: open the file and read line 14.",
      },
      ok: true,
    },
  },
  {
    id: "missing",
    ask: {
      zh: "lib/cart.ts 里的 formatMoney 是怎么实现的？",
      en: "How is formatMoney implemented in lib/cart.ts?",
    },
    why: {
      zh: "这个函数根本不存在。问题本身预设了它存在，而模型最擅长的事就是把一段文字顺下去。",
      en: "That function does not exist. The question presupposes that it does, and continuing a passage of text is the thing the model is best at.",
    },
    without: {
      text: {
        zh: "它用 Intl.NumberFormat 把数字格式化成带货币符号的字符串，大概十行左右。",
        en: "It formats a number into a currency string with Intl.NumberFormat, in about ten lines.",
      },
      checkable: {
        zh: "这段描述很合理，也完全是编的。注意它没有说「我不确定」——因为在它那一侧，这句话和一句真话是同一种东西。",
        en: "A reasonable description, and entirely invented. Note that it did not hedge: from the inside, this sentence and a true one are the same kind of object.",
      },
      ok: false,
    },
    with: {
      via: { zh: 'search_files("formatMoney")', en: 'search_files("formatMoney")' },
      text: {
        zh: "这个项目里没有 formatMoney。lib/cart.ts 里只有 applyDiscount 和 total 两个导出。",
        en: "There is no formatMoney in this project. lib/cart.ts exports only applyDiscount and total.",
      },
      checkable: {
        zh: "这是工具最被低估的用处：它不只提供事实，也提供事实的**不存在**。搜索返回了零条，模型才有底气说「没有」。",
        en: "This is the most underrated thing a tool does: it supplies not only facts but their **absence**. The search returned nothing, which is what lets the model say so.",
      },
      ok: true,
    },
  },
];

// ---------------------------------------------------------------- 文案

export const meta: LessonMeta = {
  title: { zh: "它为什么会编", en: "Why it makes things up" },
  subtitle: {
    zh: "一句流利的错话和一句流利的对话，在模型内部是同一种东西。这正是工具存在的理由。",
    en: "A fluent wrong answer and a fluent right one are the same kind of object inside the model. Which is exactly what tools are for.",
  },
  takeaway: {
    zh:
      "模型在做的是把文字接下去，不是查资料，所以「不知道」在它那里没有天然的形状。" +
      "工具给了它这个形状：查过了、返回是空的，于是它可以说没有。" +
      "**别问它知不知道，给它一个能查的地方。**",
    en:
      "The model is continuing a passage, not consulting a record, so \"I do not know\" has no natural shape " +
      "for it. A tool gives it that shape: I looked, and nothing came back, therefore there is none. " +
      "**Do not ask whether it knows. Give it somewhere to look.**",
  },
};

export const blocks: Block[] = [
  {
    title: { zh: "先看三个问题", en: "Three questions first" },
    paras: [
      {
        zh:
          "上面三个问题的共同点是：答案都不可能在模型里。" +
          "第一个随时在变，第二个在你的仓库里，第三个根本不存在。" +
          "把开关切到「没有工具」，三个回答都很流利、很具体、很自信，其中没有一个可靠。",
        en:
          "What the three questions above have in common is that none of their answers could be inside the " +
          "model. The first changes by the minute, the second lives in your repository, and the third does not " +
          "exist. Switch to without tools and all three replies are fluent, specific and confident, and none " +
          "of them is reliable.",
      },
      {
        zh:
          "特别看第三个。问题本身预设了 formatMoney 存在，而模型顺着这个预设写下去，" +
          "给了一个很像样的实现描述。它没有说「我不确定」，也不是在撒谎——" +
          "它在做它一直在做的那件事：把一段文字接下去。",
        en:
          "Look at the third one in particular. The question presupposes that formatMoney exists, and the " +
          "model continues from that presupposition into a perfectly plausible description. It did not hedge, " +
          "and it was not lying. It was doing the thing it always does: continuing a passage of text.",
      },
    ],
  },
  {
    title: { zh: "为什么它分不出自己在编", en: "Why it cannot tell that it is inventing" },
    paras: [
      {
        zh:
          "回到[[stop:/]]那句话：模型的全部工作是「给一段文字，接着生成一段文字」。" +
          "它生成下一个 [[token:token]] 的依据，是这个 token 在这段上下文之后有多合适，" +
          "而不是这句话对不对。**「合适」和「正确」在训练里高度相关，但不是同一件事**——" +
          "在它没见过的东西上，两者就分开了。",
        en:
          "Back to the sentence from [[stop:/]]: the model's entire job is to take text and produce more text. " +
          "What decides the next [[token:token]] is how well it fits after this context, not whether the " +
          "resulting sentence is true. **Fitting well and being true are strongly correlated in training and " +
          "are not the same thing** — and on anything it has not seen, they come apart.",
      },
      {
        zh:
          "所以那句编出来的话，在生成的时候和一句真话走的是完全相同的过程，" +
          "从内部看没有任何标记把它们区分开。这也解释了一个常见的失望：" +
          "追问「你确定吗」通常没用。你得到的是「关于确定性的一段合适的文字」，" +
          "不是一次真正的复核——它没有可以复核的东西。",
        en:
          "So the invented sentence was produced by exactly the same process as a true one, and from the " +
          "inside there is no marker separating them. Which explains a common disappointment: asking are you " +
          "sure usually achieves nothing. What comes back is a well-fitting passage about certainty, not a " +
          "second look — there is nothing for it to look at.",
      },
    ],
    faq: {
      q: {
        zh: "让它「不知道就说不知道」，不行吗？",
        en: "Can you not just tell it to say when it does not know?",
      },
      a: {
        zh:
          "有点用，但很有限，而且原因值得想清楚：这句指令改变的是它输出「我不知道」这句话的倾向，" +
          "不是它对自己知不知道的判断——后者它并没有。" +
          "实际效果通常是两头都变差：它开始对本来答得对的问题也推说不知道，" +
          "同时对那些「听起来很熟」的错答案照样自信。" +
          "把这句话换成一个能查的工具，效果会好一个数量级。",
        en:
          "It helps a little, and the reason it helps so little is worth understanding: the instruction shifts " +
          "how willing it is to emit the words I do not know. It does not change its judgement about whether " +
          "it knows, because there is no such judgement. What usually happens is that both ends get worse — it " +
          "starts declining questions it would have answered correctly, and stays confident on the wrong " +
          "answers that felt familiar. Replacing that sentence with a place to look is worth an order of " +
          "magnitude more.",
      },
    },
  },
  {
    title: { zh: "这就是工具的意义", en: "This is what tools are for" },
    paras: [
      {
        zh:
          "[[stop:/]]说工具是为了让模型「有手」——能读文件、能跑命令。" +
          "现在可以补上另一半，而且是更根本的一半：**工具是为了让它有个地方可查。**" +
          "一个被问几点的模型只能猜；一个有钟的模型不需要猜。" +
          "差别不在于它变聪明了，而在于答案从「它对文字的印象」变成了「[[array:数组]]里的一条 tool_result」。",
        en:
          "[[stop:/]] said tools exist so the model has hands: to read a file, to run a command. Here is the other " +
          "half, and the more fundamental one: **tools exist so it has somewhere to look.** A model asked what " +
          "time it is has to guess. A model with a clock does not. The difference is not that it became " +
          "smarter; it is that the answer moved from an impression about text to a tool_result in the " +
          "[[array:array]].",
      },
      {
        zh:
          "第三个问题最能说明这一点。工具最被低估的作用不是提供事实，是提供**事实的不存在**：" +
          "search_files(\"formatMoney\") 返回零条，这件事本身是一条可以写进数组的证据，" +
          "模型于是有了说「没有这个函数」的依据。" +
          "没有工具的时候，「不知道」在它那里没有形状，因为没有任何东西能把它推到那个方向。",
        en:
          "The third question makes this clearest. The most underrated thing a tool does is not to supply a " +
          "fact but to supply **the absence of one**: search_files(\"formatMoney\") returning nothing is itself " +
          "evidence that can be written into the array, and that is what gives the model grounds to say the " +
          "function does not exist. Without a tool, \"I do not know\" has no shape, because nothing is pushing " +
          "it in that direction.",
      },
    ],
  },
  {
    title: { zh: "引用也可以是编的", en: "A citation can be invented too" },
    paras: [
      {
        zh:
          "常见的下一招是要求它给出处：把资料检索回来放进数组，再让它在回答里引用。" +
          "这确实有效，是目前最实用的办法（通常叫检索增强，retrieval）。但它有一个边界要认清：" +
          "**引用本身也是生成出来的文字。**一个既没读过也不存在的文件名、一个凑出来的行号，" +
          "和真正的出处长得一样。",
        en:
          "The usual next move is to demand sources: retrieve the material into the array and have the answer " +
          "cite it. That works, and it is the most practical technique available. It has one boundary worth " +
          "being clear about: **a citation is also generated text.** A filename it never read, or a line " +
          "number assembled to look right, is indistinguishable from a real source.",
      },
      {
        zh:
          "所以真正管用的不是「要求它引用」，是**要求引用可以被核对**，并且真的去核对。" +
          "「lib/client.ts 第 4 行」这种引用有价值，因为打开文件看一眼就能证伪；" +
          "「根据项目文档」这种引用没有价值，因为它没有指向任何可以打开的东西。" +
          "[[ahead:/tools]]那条「把返回量的上限写进工具说明」在这里又用上了：" +
          "一个返回文件和行号的工具，让核对变成一件几秒钟的事。",
        en:
          "So the technique that pays is not requiring a citation but **requiring a citation you can check**, " +
          "and then checking it. A reference to lib/client.ts line 4 is worth something because opening the " +
          "file falsifies it in seconds. A reference to the project documentation is worth nothing, because it " +
          "points at nothing you can open. The rule from [[ahead:/tools]] returns here: a tool that returns a filename " +
          "and a line number makes verification a few seconds' work.",
      },
    ],
    faq: {
      q: {
        zh: "把资料都检索回来，是不是就不会编了？",
        en: "Does retrieving the material stop it inventing?",
      },
      a: {
        zh:
          "会少很多，不会没有。有三个漏口值得记住。" +
          "检索没找到相关内容时，模型还是会答——除非你的工具明确告诉它「零条」（前面那一条）。" +
          "检索回来的内容本身可能是错的或者过期的，而模型没有立场质疑它。" +
          "以及，检索回来的东西是外部内容，可能在对模型说话——那是[[ahead:/trust]]。" +
          "检索把「凭印象编」换成了「依赖你给的材料」，材料的质量就成了新的上限。",
        en:
          "Much less, not none, and there are three gaps worth remembering. When retrieval finds nothing " +
          "relevant the model still answers, unless your tool says plainly that nothing came back. What was " +
          "retrieved can itself be wrong or out of date, and the model is in no position to doubt it. And " +
          "retrieved material is outside content, which may be talking to the model — that is [[ahead:/trust]]. " +
          "Retrieval replaces inventing from impressions with depending on what you supplied, which makes the " +
          "quality of what you supplied the new ceiling.",
      },
    },
  },
];

export const bench = {
  title: { zh: "三个问题，两种条件", en: "Three questions, two conditions" },
  note: { zh: "示例回答", en: "illustrative answers" },
  toggle: { zh: "给不给它工具", en: "With or without tools" },
  without: { zh: "没有工具", en: "Without tools" },
  withoutHint: { zh: "只能凭训练里的印象", en: "only impressions from training" },
  withTools: { zh: "有工具", en: "With tools" },
  withHint: { zh: "有地方可以查", en: "somewhere to look" },
  whyWord: { zh: "为什么答案不可能在模型里", en: "Why the answer cannot be inside the model" },
  viaWord: { zh: "它查了", en: "It looked at" },
  answerWord: { zh: "回答", en: "The answer" },
  checkWord: { zh: "能不能核对", en: "Can you check it" },
};
