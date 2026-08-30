// 第 8 站「谁来说可以」：把循环停在一次工具请求前面，由读者做决定，
// 然后让运行按这个决定真的分岔。三条分支的差别是这一站的全部内容。

import type { L } from "@/lib/i18n";
import type { Block, LessonMeta } from "@/lib/lesson";

export type Beat = {
  who: "user" | "assistant" | "tool" | "aside";
  label: L;
  body: L;
  // 这一拍是不是一次有副作用的动作
  effect?: boolean;
  bad?: boolean;
};

export type Choice = "once" | "always" | "refuse";

export type Branch = {
  id: Choice;
  name: L;
  hint: L;
  // 选了它，你到底承诺了什么
  commits: L;
  beats: Beat[];
  verdict: L;
  tone: "ok" | "warn" | "bad";
};

// 决定之前的部分，三条分支共用。
export const prelude: Beat[] = [
  {
    who: "user",
    label: { zh: "任务", en: "the task" },
    body: {
      zh: "lib/cart.ts 里的会员折扣没生效，帮我修一下。",
      en: "The member discount in lib/cart.ts is not being applied. Fix it.",
    },
  },
  {
    who: "assistant",
    label: { zh: "读文件", en: "read a file" },
    body: {
      zh: 'tool_use: read_file("lib/cart.ts")　—— 没有停下来问',
      en: 'tool_use: read_file("lib/cart.ts") — did not stop to ask',
    },
  },
  {
    who: "tool",
    label: { zh: "tool_result", en: "tool_result" },
    body: {
      zh: "第 31 行：total = subtotal（折扣算出来了，但没有用上）",
      en: "line 31: total = subtotal (the discount is computed and then ignored)",
    },
  },
  {
    who: "assistant",
    label: { zh: "写文件", en: "write a file" },
    body: {
      zh: 'tool_use: write_file("lib/cart.ts", …)　—— 循环在这里停住了',
      en: 'tool_use: write_file("lib/cart.ts", …) — the loop stops here',
    },
    effect: true,
  },
];

export const branches: Branch[] = [
  {
    id: "once",
    name: { zh: "只允许这一次", en: "Allow once" },
    hint: { zh: "这一次可以，下次再问", en: "this call only, ask again next time" },
    commits: {
      zh: "你承诺的只有这一次调用，参数就是你刚才看到的那一组。下一次它要写文件，还会再停下来。",
      en: "You have approved exactly this call with exactly these arguments. The next write stops and asks again.",
    },
    beats: [
      {
        who: "aside",
        label: { zh: "你的决定", en: "your decision" },
        body: { zh: "允许这一次。", en: "Allowed, once." },
      },
      {
        who: "tool",
        label: { zh: "tool_result", en: "tool_result" },
        body: { zh: "已写入 lib/cart.ts（1 处修改）", en: "wrote lib/cart.ts (1 change)" },
        effect: true,
      },
      {
        who: "assistant",
        label: { zh: "跑测试", en: "run the tests" },
        body: {
          zh: 'tool_use: run_command("npm test")　—— 又停下来了',
          en: 'tool_use: run_command("npm test") — stops again',
        },
        effect: true,
      },
      {
        who: "aside",
        label: { zh: "又轮到你", en: "your turn again" },
        body: {
          zh: "第二次询问。这就是「只这一次」的代价：安全，但每一步都要你在场。",
          en: "A second prompt. That is the cost of once: safe, and it needs you present at every step.",
        },
      },
    ],
    verdict: {
      zh:
        "最保守，也最烦人。一个要改十个文件的任务，会问你十次；" +
        "问到第七次的时候，你已经不再读参数了——这才是真正的风险。" +
        "「每次都问」在纸面上最安全，在实践中会把人训练成无脑点允许。",
      en:
        "The most conservative option and the most tiring one. A task that touches ten files asks ten times, " +
        "and by the seventh prompt you have stopped reading the arguments — which is the real risk. Asking " +
        "every time is the safest design on paper and, in practice, trains a person to click Allow without " +
        "looking.",
    },
    tone: "ok",
  },
  {
    id: "always",
    name: { zh: "以后都允许", en: "Allow always" },
    hint: { zh: "别再问了", en: "stop asking me" },
    commits: {
      zh:
        "注意你承诺的是什么：几乎所有实现里，「总是」绑定的是工具，不是这一次的参数。" +
        "你说的是「以后 write_file 都不用问」，而不是「以后写 lib/cart.ts 都不用问」。",
      en:
        "Notice what you approved: in almost every implementation, always binds to the tool, not to these " +
        "arguments. You said write_file never has to ask again — not write_file for lib/cart.ts never has to " +
        "ask again.",
    },
    beats: [
      {
        who: "aside",
        label: { zh: "你的决定", en: "your decision" },
        body: { zh: "以后 write_file 都允许。", en: "write_file is allowed from now on." },
      },
      {
        who: "tool",
        label: { zh: "tool_result", en: "tool_result" },
        body: { zh: "已写入 lib/cart.ts（1 处修改）", en: "wrote lib/cart.ts (1 change)" },
        effect: true,
      },
      {
        who: "assistant",
        label: { zh: "补一个测试", en: "add a test" },
        body: {
          zh: 'write_file("lib/cart.test.ts", …)　—— 没有问',
          en: 'write_file("lib/cart.test.ts", …) — no prompt',
        },
        effect: true,
      },
      {
        who: "assistant",
        label: { zh: "测试跑不起来", en: "the tests will not run" },
        body: {
          zh: "jest 找不到配置。它决定改一下项目配置。",
          en: "jest cannot find a config. It decides to adjust the project configuration.",
        },
      },
      {
        who: "assistant",
        label: { zh: "改 package.json", en: "rewrite package.json" },
        body: {
          zh: 'write_file("package.json", …)　—— 也没有问',
          en: 'write_file("package.json", …) — no prompt either',
        },
        effect: true,
        bad: true,
      },
      {
        who: "aside",
        label: { zh: "已经发生了", en: "already done" },
        body: {
          zh: "你批准的是「写文件」这件事，不是「写这个文件」。第三次写入你没有看见。",
          en: "You approved writing files, not writing that file. The third write happened without you.",
        },
        bad: true,
      },
    ],
    verdict: {
      zh:
        "最方便，也最容易越界。问题不在于模型不老实，而在于你批准的那句话比你以为的宽。" +
        "如果一定要有「总是」，就让它绑定得更窄：某个工具、某个目录、某种参数形状，" +
        "并且给它一个有效期。「以后都允许」如果没有范围，它的范围就是「全部」。",
      en:
        "The most convenient option and the easiest one to overshoot. The problem is not that the model is " +
        "dishonest; it is that the sentence you approved was broader than you thought. If there is going to " +
        "be an always, bind it narrowly — one tool, one directory, one shape of argument — and give it an " +
        "expiry. An always with no scope has exactly one scope, which is everything.",
    },
    tone: "bad",
  },
  {
    id: "refuse",
    name: { zh: "拒绝", en: "Refuse" },
    hint: { zh: "不许写，但活还得干", en: "no write, but the work still stands" },
    commits: {
      zh: "拒绝不是把 agent 关掉。它是一条 tool_result，和别的结果一样，会被追加进数组。",
      en: "Refusing does not switch the agent off. It is a tool_result like any other, appended to the array.",
    },
    beats: [
      {
        who: "aside",
        label: { zh: "你的决定", en: "your decision" },
        body: { zh: "拒绝这次写入。", en: "The write is refused." },
      },
      {
        who: "tool",
        label: { zh: "tool_result", en: "tool_result" },
        body: {
          zh: "拒绝执行：用户没有批准这次写入。你可以把改动作为文本给出。",
          en: "Denied: the user did not approve this write. You may output the change as text instead.",
        },
      },
      {
        who: "assistant",
        label: { zh: "换个交付方式", en: "deliver it another way" },
        body: {
          zh: "好的，这是需要的改动：lib/cart.ts 第 31 行 total = subtotal → total = subtotal - discount。",
          en: "Understood. Here is the change: lib/cart.ts line 31, total = subtotal becomes total = subtotal - discount.",
        },
      },
      {
        who: "aside",
        label: { zh: "循环正常结束", en: "the loop ends normally" },
        body: {
          zh: "stop_reason: end_turn。没有异常，没有崩溃——被拒绝只是它读到的又一段文字。",
          en: "stop_reason: end_turn. No exception and no crash: being refused is just more text it read.",
        },
      },
    ],
    verdict: {
      zh:
        "关键在于拒绝的措辞。只写「拒绝执行」，模型只知道路被堵了；" +
        "补一句「你可以把改动作为文本给出」，它就知道往哪走。" +
        "这和第 2 站那条是同一条：模型能想到什么，取决于你写进数组的是什么。" +
        "一个设计良好的拒绝，会同时说清楚「不行」和「那可以怎么办」。",
      en:
        "What matters is the wording of the refusal. Denied on its own tells the model only that a road is " +
        "closed. Adding you may output the change as text tells it where to go instead. This is the rule from " +
        "stop 2 again: what the model can think of next depends on what you wrote into the array. A refusal " +
        "worth writing says both no and here is what you can do.",
    },
    tone: "ok",
  },
];

// ---------------------------------------------------------------- 文案

export const meta: LessonMeta = {
  title: { zh: "第 8 站 · 谁来说可以", en: "Stop 8 · Who says yes" },
  subtitle: {
    zh: "循环想执行一条命令，总得有人决定它可不可以。这一站由你来做那个决定。",
    en: "The loop wants to run a command. Someone has to decide whether it may. On this stop, that someone is you.",
  },
  takeaway: {
    zh:
      "什么都问的 agent 没人用，什么都不问的 agent 没人敢用，每个真实系统都是这条线上的一个位置。" +
      "选位置的办法不是问「这一步危不危险」，而是问「如果它做错了，我能不能撤回来」。",
    en:
      "An agent that asks about everything goes unused; an agent that asks about nothing goes untrusted. Every " +
      "real system is a position on that line. The way to choose one is not to ask how risky a step is, but " +
      "whether you could undo it if the step were wrong.",
  },
};

export const blocks: Block[] = [
  {
    title: { zh: "读和写不是一回事", en: "Reading and writing are not the same" },
    paras: [
      {
        zh:
          "看上面那次运行的前两拍：read_file 直接执行了，没有停；write_file 停住了。" +
          "这条线画在哪里，值得说清楚——它画在**有没有副作用**上，而不是画在「危不危险」上。",
        en:
          "Look at the first beats of the run above: read_file simply ran, and write_file stopped. Where that " +
          "line is drawn is worth stating plainly: it is drawn at **whether there is a side effect**, not at " +
          "how dangerous something is.",
      },
      {
        zh:
          "这两个说法经常被混为一谈，但它们不一样。读一个文件可能非常危险——" +
          "读的是 .env，内容就进了[[array:数组]]，此后每一轮都会随请求发出去（第 4 站）。" +
          "写一个文件可能毫无风险——往临时目录写一行日志。" +
          "但「有没有副作用」这个问题，你的代码能自动回答；「危不危险」不能。" +
          "边界画在能自动判断的那一侧，是工程上唯一可行的做法。",
        en:
          "The two get conflated, and they are not the same. Reading a file can be extremely dangerous: read " +
          ".env and its contents enter the [[array:array]], where they are resent with every later round " +
          "(stop 4). Writing a file can carry no risk at all: a line appended to a log in a temporary " +
          "directory. But whether an action has a side effect is a question your code can answer " +
          "automatically, and whether it is dangerous is not. Drawing the boundary at the answerable question " +
          "is the only version of this that can actually be built.",
      },
      {
        zh:
          "更实用的版本是问可逆性：**这一步如果做错了，我能不能撤回来。**" +
          "读文件可逆——把消息从数组里删掉就是了（虽然钱已经花了）。" +
          "写文件在有版本控制时接近可逆，发一封邮件不可逆，转一笔账不可逆。" +
          "按可逆性排序，你会发现真正需要人点头的动作，比直觉上要少得多。",
        en:
          "The more useful version of the question is reversibility: **if this step were wrong, could I take " +
          "it back?** Reading is reversible — delete the message from the array, though the money is spent. " +
          "Writing a file is nearly reversible under version control. Sending an email is not. Moving money is " +
          "not. Sort your tools by reversibility and the set that genuinely needs a human nod turns out to be " +
          "much smaller than instinct suggests.",
      },
    ],
    faq: {
      q: {
        zh: "那读文件就完全不用管了吗？",
        en: "So reads need no control at all?",
      },
      a: {
        zh:
          "要管，但管的方式不同。副作用用审批来管，读取用范围来管：" +
          "限定这个 agent 能看到哪些目录，比在每次读之前弹一个框有用得多，" +
          "因为前者是一条你只设一次的规则，后者是一个你会点烦的按钮。" +
          "两种控制手段解决的是不同的问题，把它们混在一起用，通常两边都做不好。",
        en:
          "They need control, of a different kind. Side effects are governed by approval; reads are governed " +
          "by scope. Deciding which directories this agent can see at all is worth far more than a dialog " +
          "before every read, because the first is a rule you set once and the second is a button you will " +
          "get tired of. They solve different problems, and using one for the other usually does neither well.",
      },
    },
  },
  {
    title: { zh: "三个答案，和它们各自的账", en: "Three answers, and what each one costs" },
    paras: [
      {
        zh:
          "上面那三个按钮是绝大多数系统会给你的全部选项。看起来是三档强度，其实是三种不同的承诺，" +
          "而中间那个的承诺范围，几乎总是比人以为的大。",
        en:
          "The three buttons above are, in most systems, the whole menu. They look like three levels of " +
          "strictness. They are three different promises, and the middle one almost always promises more than " +
          "people think.",
      },
      {
        zh:
          "「以后都允许」通常绑定在**工具**上，而不是绑定在这一次的参数上。" +
          "你在看着 write_file(\"lib/cart.ts\") 的时候点了「总是」，" +
          "你批准的是 write_file 这个动作本身，于是后面那次 write_file(\"package.json\") 就不再经过你。" +
          "这不是实现的疏忽，是「总是」这个词本来就没有范围——" +
          "范围得由设计它的人补上：绑到某个目录、某种参数形状、某段时间。",
        en:
          "Allow always usually binds to the **tool**, not to the arguments in front of you. You clicked it " +
          "while looking at write_file(\"lib/cart.ts\"), so what you approved was write_file — and the later " +
          "write_file(\"package.json\") no longer passes through you. This is not an oversight in the " +
          "implementation; the word always simply has no scope of its own. The scope has to be supplied by " +
          "whoever designs it: a directory, a shape of argument, a window of time.",
      },
    ],
  },
  {
    title: { zh: "被拒绝之后，agent 看到的是什么", en: "What the agent sees when you say no" },
    paras: [
      {
        zh:
          "很多人以为拒绝会让 agent 崩掉或者卡住。不会。" +
          "拒绝在数组里就是一条普通的 tool_result——和一次命令失败、一个文件不存在完全同构。" +
          "第 2 站那条规则在这里再次适用：模型接下来能想到什么，取决于这条消息里写了什么。",
        en:
          "People expect a refusal to make the agent crash or stall. It does not. In the array a refusal is an " +
          "ordinary tool_result, structurally identical to a failed command or a missing file. The rule from " +
          "stop 2 applies again: what the model can think of next depends on what that message says.",
      },
      {
        zh:
          "所以拒绝也要好好写。只回「拒绝执行」，模型只知道此路不通，" +
          "接下来它可能换个工具再试一次，也可能直接放弃并给一个含糊的交代。" +
          "回「拒绝执行：用户没有批准这次写入。你可以把改动作为文本给出」，" +
          "它就会把 diff 交给你——任务其实完成了，只是换了个交付方式。" +
          "一个好的拒绝同时回答两件事：不行，以及那可以怎么办。",
        en:
          "So a refusal deserves to be written well. Denied on its own tells the model only that this road is " +
          "closed; it may try another tool, or give up with a vague account of why. Denied: the user did not " +
          "approve this write, you may output the change as text instead gets you the diff — the task is " +
          "finished, only delivered differently. A good refusal answers two things at once: no, and here is " +
          "what you can do.",
      },
    ],
    faq: {
      q: {
        zh: "这和第 7 站有什么关系？",
        en: "How does this connect to stop 7?",
      },
      a: {
        zh:
          "关系很直接：审批之所以存在，是因为提出这个动作的那段文字，未必出自你。" +
          "第 7 站里那个网页可以让 agent 去请求一个动作，而 agent 分不出那句话是你说的还是页面说的。" +
          "审批是那一层分不清的最后一道补救——它不判断请求是谁提的，它只保证有副作用的动作要有人点头。" +
          "反过来说，这也解释了为什么「以后都允许」的范围要小：" +
          "你放宽的每一寸，都是注入能直接用上的那一寸。",
        en:
          "Directly: approval exists because the text asking for the action may not have come from you. The " +
          "page at stop 7 can make an agent request an action, and the agent cannot tell which sentence was " +
          "yours. Approval is the remedy for exactly that confusion — it does not judge who asked, it only " +
          "insists that something with a side effect gets a nod. Which is also the argument for keeping the " +
          "scope of an always small: every inch you widen is an inch an injection can use.",
      },
    },
  },
  {
    title: { zh: "这条线上没有正确答案", en: "There is no correct point on the line" },
    paras: [
      {
        zh:
          "一个什么都问的 agent 没人会用：三十次确认之后，人会去写脚本绕过它。" +
          "一个什么都不问的 agent 没人敢用：它第一次删错东西，你就再也不会让它碰生产环境。" +
          "每一个真实系统都是这条线上的某个位置，而位置的选法跟场景有关——" +
          "本地跑测试和给客户发邮件，不该用同一条线。",
        en:
          "An agent that asks about everything goes unused: after thirty confirmations a person writes a " +
          "script to get around it. An agent that asks about nothing goes untrusted: the first time it deletes " +
          "the wrong thing, it never touches production again. Every real system sits somewhere on that line, " +
          "and where depends on the setting — running tests locally and sending mail to customers should not " +
          "share a threshold.",
      },
      {
        zh:
          "有几件事在任何位置上都成立。审批的对象要是**动作**，不是工具的名字。" +
          "确认框里要显示实际参数，不然人点的是「允许 write_file」而不是「允许写这个文件」。" +
          "「总是」要有范围和有效期。以及最重要的一条：" +
          "如果一个动作错了你撤不回来，那它就不该只靠一次点击来把关——" +
          "该做的是先让它变得可撤回，比如先写到暂存区、先生成 diff、先进草稿箱。",
        en:
          "A few things hold wherever you sit. Approve **actions**, not tool names. Show the actual arguments " +
          "in the prompt, or the person is approving write_file rather than approving writing that file. Give " +
          "always a scope and an expiry. And the one that matters most: if an action cannot be undone when it " +
          "is wrong, it should not be guarded by a single click. Make it undoable first — stage it, produce a " +
          "diff, put it in drafts.",
      },
    ],
  },
];

export const bench = {
  title: { zh: "循环停在这里，等你决定", en: "The loop stops here, waiting for you" },
  note: { zh: "你的选择会改变后面的运行", en: "your answer changes what follows" },
  chooseLabel: { zh: "这次写入，你的决定是", en: "Your decision on this write" },
  pending: { zh: "等待批准", en: "waiting for approval" },
  effectTag: { zh: "有副作用", en: "side effect" },
  noAsk: { zh: "没有询问", en: "no prompt" },
  commitsWord: { zh: "你承诺了什么", en: "What you approved" },
  verdictWord: { zh: "这个选择的账", en: "What it costs" },
  resetWord: { zh: "换一个决定", en: "Choose again" },
  beforeWord: { zh: "决定之前", en: "Before the decision" },
};
