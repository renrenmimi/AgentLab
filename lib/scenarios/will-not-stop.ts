// 停不下来：工具把「命令失败」变成了「空结果」，
// 模型看到空结果就换个地方再找一次，循环靠保险丝才停下。

import type { Scenario } from "./types";
import { n } from "./types";

const code: Scenario["code"] = {
  zh: [
    'const messages = [{ role: "user", content: task }];',
    '',
    '// 循环唯一的正常出口，是下面那句 break。',
    '// 除此之外它不会自己停，所以先装一根保险丝。',
    'const MAX_STEPS = 8; // 最多允许模型点 8 次工具',
    'let step = 0;',
    '',
    'while (step < MAX_STEPS) {',
    '  step++;',
    '  const res = await client.messages.create({',
    '    model: "claude-sonnet-5",',
    '    max_tokens: 4096,',
    '    tools,',
    '    messages,',
    '  });',
    '  messages.push({ role: "assistant", content: res.content });',
    '',
    '  if (res.stop_reason !== "tool_use") break; // ← 正常出口',
    '',
    '  const results = await runTools(res.content);',
    '  messages.push({ role: "user", content: results });',
    '}',
    '',
    'if (step >= MAX_STEPS) {',
    '  // 保险丝烧了：任务没做完，但账单停在这里',
    '  console.warn("停在第 " + step + " 步，模型还在要工具");',
    '}',
    '',
    '// 真正出问题的地方在这里，不在模型：',
    'async function runCommand({ command }) {',
    '  const { stdout } = await exec(command); // stderr 被丢掉了',
    '  return stdout; // 命令失败时，这里是一个空字符串',
    '}',
  ],
  en: [
    'const messages = [{ role: "user", content: task }];',
    '',
    '// The only normal way out of this loop is the break below.',
    '// Nothing else stops it, so fit a fuse first.',
    'const MAX_STEPS = 8; // at most 8 tool calls',
    'let step = 0;',
    '',
    'while (step < MAX_STEPS) {',
    '  step++;',
    '  const res = await client.messages.create({',
    '    model: "claude-sonnet-5",',
    '    max_tokens: 4096,',
    '    tools,',
    '    messages,',
    '  });',
    '  messages.push({ role: "assistant", content: res.content });',
    '',
    '  if (res.stop_reason !== "tool_use") break; // ← the normal exit',
    '',
    '  const results = await runTools(res.content);',
    '  messages.push({ role: "user", content: results });',
    '}',
    '',
    'if (step >= MAX_STEPS) {',
    '  // The fuse blew: the task is unfinished, but the bill stops here',
    '  console.warn("stopped at step " + step + ", still asking for tools");',
    '}',
    '',
    '// The real fault is here, not in the model:',
    'async function runCommand({ command }) {',
    '  const { stdout } = await exec(command); // stderr is thrown away',
    '  return stdout; // when the command fails, this is an empty string',
    '}',
  ],
};

const steps: Scenario["steps"] = [
  {
    title: {
      zh: "一个会数数的小任务，和一根保险丝",
      en: "A small counting task, and a fuse",
    },
    narration: {
      zh:
        "这次的任务是数数：项目里还剩多少个 TODO 注释。只给了一个工具 run_command。" +
        "先看第 5 行的 MAX_STEPS——[[array:数组]]和循环本身没有任何自我约束，" +
        "循环唯一的正常出口是第 18 行那句 break，只有模型不再要工具时才会走到。" +
        "如果模型一直要工具，这个 while 就会一直转下去，直到你按 Ctrl-C，或者账单先替你按。" +
        "MAX_STEPS 是一根保险丝：它不解决任何问题，只保证问题有个尽头。",
      en:
        "The task is a counting job: how many TODO comments are left in the project. There is one tool, " +
        "run_command. Look at MAX_STEPS on line 5 first. Neither the [[array:array]] nor the loop restrains " +
        "itself in any way; the only normal exit is the break on line 18, and it is reached only when the model " +
        "stops asking for tools. If the model keeps asking, this while runs until you press Ctrl-C or the bill " +
        "presses it for you. MAX_STEPS is a fuse. It solves nothing; it only guarantees that the problem ends.",
    },
    faq: {
      q: {
        zh: "为什么不写成「转 3 轮就够了」？",
        en: "Why not just write \"three rounds is enough\"?",
      },
      a: {
        zh: "因为轮数取决于任务，事先没人知道。同一个 agent，问「这个文件夹里有什么」可能一轮就够，问「把这三个 bug 都修了」可能要三十轮。写死轮数会让简单任务浪费、复杂任务做不完。保险丝的作用不是规定轮数，而是在事情明显不对劲的时候止损。",
        en: "Because the number of rounds depends on the task and nobody knows it in advance. The same agent might need one round for \"what is in this folder\" and thirty for \"fix these three bugs\". A hardcoded count wastes rounds on easy tasks and cuts hard ones short. A fuse does not decide how many rounds are right; it decides when to stop paying for a run that has clearly gone wrong.",
      },
    },
    msgs: [
      {
        tag: "system",
        body: {
          zh: "你是一个本地文件助手，可以用 run_command 执行 shell 命令。",
          en: "You are a local file assistant; you can run shell commands with run_command.",
        },
        sys: true,
      },
    ],
    round: 0,
    tokens: 0,
    meter: {
      label: { zh: "已用步数", en: "Steps used" },
      used: 0,
      limit: 8,
    },
    focus: [
      [3, 6],
      [8, 8],
    ],
  },
  {
    action: { zh: "发送任务", en: "Send the task" },
    title: { zh: "任务进数组", en: "The task goes into the array" },
    narration: {
      zh:
        "和顺利的那次一模一样：一条 user 消息进数组，还没有任何东西发出去。" +
        "到这一步为止，两次运行完全无法区分——出问题的地方还在后面，而且不在这段循环里。",
      en:
        "Exactly as in the clean run: one user message goes into the array, and nothing has been sent yet. " +
        "Up to this point the two runs are indistinguishable. What goes wrong is still ahead, and it is not in " +
        "this loop.",
    },
    chat: [
      {
        kind: "user",
        text: {
          zh: "这个项目里还剩多少个 TODO 注释？",
          en: "How many TODO comments are left in this project?",
        },
      },
    ],
    msgs: [
      {
        tag: "user",
        body: {
          zh: "这个项目里还剩多少个 TODO 注释？",
          en: "How many TODO comments are left in this project?",
        },
      },
    ],
    round: 0,
    focus: [[1, 1]],
  },
  {
    action: { zh: "第 1 步：发给模型", en: "Step 1: send it to the model" },
    title: { zh: "第 1 步：模型开始找", en: "Step 1: the model starts looking" },
    narration: {
      zh:
        "模型不知道这个项目长什么样，于是先猜一个常见的目录名：src。" +
        "这是完全合理的第一步——换成你，第一次进一个陌生项目大概也会先去 src 看看。" +
        "stop_reason 是 tool_use，轮到你的代码执行了。",
      en:
        "The model has never seen this project, so it guesses a common directory name: src. This is a " +
        "reasonable first move — walking into an unfamiliar project, you would probably look in src too. " +
        "stop_reason is tool_use, so it is your code's turn.",
    },
    chat: [
      {
        kind: "assistant",
        text: {
          zh: "我先在 src 目录下找一遍 TODO。",
          en: "Let me search src for TODO first.",
        },
      },
      { kind: "tool_call", name: "run_command", arg: 'grep -rn "TODO" src/' },
    ],
    msgs: [
      {
        tag: "assistant · tool_use",
        body: n('{ "command": "grep -rn \\"TODO\\" src/" }'),
        mono: true,
        color: "purple",
      },
    ],
    round: 1,
    stopReason: "tool_use",
    stopTone: "wait",
    tokens: 610,
    meter: { label: { zh: "已用步数", en: "Steps used" }, used: 1, limit: 8 },
    focus: [[10, 16]],
  },
  {
    action: { zh: "执行 grep", en: "Run the grep" },
    title: { zh: "命令失败了，但数组里看不出来", en: "The command failed, and the array cannot tell" },
    narration: {
      zh:
        "这个项目没有 src 目录。grep 往 stderr 写了一句 “No such file or directory”，退出码 2，" +
        "stdout 是空的。然后看第 31、32 行：runCommand 只取了 stdout，把 stderr 和退出码都丢掉了。" +
        "于是追加进数组的 tool_result 是一个空字符串。" +
        "对模型来说，这条消息的含义不是「你的路径写错了」，而是「找过了，一个都没有」——" +
        "这两件完全不同的事，被压成了同一段文字。",
      en:
        "This project has no src directory. grep wrote \"No such file or directory\" to stderr, exited with " +
        "code 2, and printed nothing to stdout. Now look at lines 31 and 32: runCommand keeps stdout and " +
        "throws away both stderr and the exit code. What gets appended to the array is an empty string. " +
        "To the model that message does not mean \"your path was wrong\". It means \"I looked, and there were " +
        "none\". Two completely different facts have been flattened into the same text.",
    },
    faq: {
      q: {
        zh: "模型不能自己看出命令失败了吗？",
        en: "Can the model not tell that the command failed?",
      },
      a: {
        zh: "不能。模型能看到的，只有你放进[[array:数组]]里的东西。退出码、stderr、命令跑了多久、有没有跑——这些都不在数组里，它就完全无从得知。这是全站最值得记住的一条：模型对你机器的了解，一个字都不多于你写进 tool_result 的内容。",
        en: "No. The model sees only what you put in the [[array:array]]. The exit code, stderr, how long the command took, whether it ran at all — none of that is in the array, so none of it exists as far as the model is concerned. This is the single most useful thing to remember on this site: the model knows about your machine exactly what you wrote into the tool_result, and not one word more.",
      },
    },
    chat: [
      { kind: "tool_error", text: "grep: src/: No such file or directory   (exit 2, stderr)" },
      { kind: "tool_output", text: "" },
    ],
    msgs: [
      {
        tag: "user · tool_result",
        body: { zh: "（空字符串）", en: "(empty string)" },
        mono: true,
        color: "amber",
      },
    ],
    focus: [
      [30, 33],
      [20, 21],
    ],
  },
  {
    action: { zh: "第 2 步：再发给模型", en: "Step 2: send it again" },
    title: { zh: "第 2 步：换个地方再找", en: "Step 2: look somewhere else" },
    narration: {
      zh:
        "模型读到的是「src 里没有 TODO」，于是做了一件很合理的事：换个目录再找。" +
        "注意这里没有任何「模型犯傻」的成分——给定它能看到的东西，这是正确的下一步。" +
        "错误发生在两步之前，发生在那个把失败写成空字符串的函数里。",
      en:
        "What the model read was \"there are no TODOs in src\", so it does something entirely sensible: it " +
        "looks in another directory. There is no failure of reasoning here. Given what it can see, this is the " +
        "correct next move. The mistake happened two steps ago, inside the function that wrote a failure as an " +
        "empty string.",
    },
    chat: [
      {
        kind: "assistant",
        text: {
          zh: "src 里没有。也许代码放在 lib 下面，我去那里找。",
          en: "Nothing in src. The code may live under lib; let me look there.",
        },
      },
      { kind: "tool_call", name: "run_command", arg: 'grep -rn "TODO" lib/src/' },
    ],
    msgs: [
      {
        tag: "assistant · tool_use",
        body: n('{ "command": "grep -rn \\"TODO\\" lib/src/" }'),
        mono: true,
        color: "purple",
      },
    ],
    round: 2,
    stopReason: "tool_use",
    stopTone: "wait",
    tokens: 1140,
    meter: { label: { zh: "已用步数", en: "Steps used" }, used: 2, limit: 8 },
    focus: [[10, 16]],
  },
  {
    action: { zh: "执行第 2 次 grep", en: "Run the second grep" },
    title: { zh: "同样的空字符串", en: "The same empty string" },
    narration: {
      zh:
        "lib/src 也不存在，于是又是一个空字符串。数组现在有两条一模一样的 tool_result，" +
        "而它们记录的其实是两次不同的失败。" +
        "循环的形状没有任何问题——它就是在忠实地重复「发数组 → 执行 → 追加」。" +
        "问题在于，每一轮追加进去的都是同一句没有信息量的话。",
      en:
        "lib/src does not exist either, so the result is another empty string. The array now holds two " +
        "identical tool_results that in fact record two different failures. There is nothing wrong with the " +
        "shape of the loop: it is faithfully repeating send, run, append. The problem is that every round " +
        "appends the same uninformative sentence.",
    },
    chat: [
      { kind: "tool_error", text: "grep: lib/src/: No such file or directory   (exit 2, stderr)" },
      { kind: "tool_output", text: "" },
    ],
    msgs: [
      {
        tag: "user · tool_result",
        body: { zh: "（空字符串）", en: "(empty string)" },
        mono: true,
        color: "amber",
      },
    ],
    focus: [[30, 33]],
  },
  {
    action: { zh: "快进：第 3 到 7 步", en: "Fast-forward: steps 3 to 7" },
    title: { zh: "第 3 到 7 步：一样的形状，五遍", en: "Steps 3 to 7: the same shape, five times" },
    narration: {
      zh:
        "接下来五步全是同一个形状，这里一次放完：source/、app/src/、./src、根目录带别的参数、" +
        "再换一种写法。每一步都是一次完整的 API 调用，每一次都要把已经变长的整个数组重新发一遍。" +
        "看右下角两个数字：步数从 2 走到 7，[[token:token]] 从一千出头涨到接近五千——" +
        "涨的不是这一轮多问的那句话，而是前面所有轮的历史被反复重发。" +
        "这就是空转最贵的地方：它不会报错，只会安静地花钱。",
      en:
        "The next five steps all have the same shape, so here they are at once: source/, app/src/, ./src, the " +
        "project root with different flags, and one more spelling. Each is a full API call, and each resends " +
        "the whole array, which keeps getting longer. Watch the two numbers in the corner: steps go from 2 to " +
        "7, and [[token:token]]s climb from just over a thousand to nearly five thousand. What grows is not " +
        "the one new sentence per round; it is the entire history being resent every time. That is what makes " +
        "spinning expensive: it never raises an error, it just quietly spends.",
    },
    faq: {
      q: {
        zh: "模型为什么不觉得自己在原地打转？",
        en: "Why does the model not notice that it is going in circles?",
      },
      a: {
        zh: "因为数组里没有任何东西告诉它「这些尝试都失败了」。它读到的是七条「找过了，没有」，合起来的意思是「这个项目里 TODO 很难找」，而不是「我的方法不对」。模型没有数组之外的记忆，也没有「我已经试过这招」的感觉——所有它知道的事，都必须由你写进数组。",
        en: "Because nothing in the array says that these attempts failed. What it reads is seven statements of \"I looked, none there\", which together mean \"TODOs are hard to find in this project\", not \"my approach is wrong\". The model has no memory outside the array and no sense of having tried something before. Everything it knows has to be put there by you.",
      },
    },
    chat: [
      { kind: "aside", text: { zh: "…… 第 3 到 7 步：五次搜索，五个空字符串 ……", en: "… steps 3 to 7: five searches, five empty strings …" } },
    ],
    msgs: [
      {
        tag: "assistant · tool_use ×5",
        body: {
          zh: "source/、app/src/、./src、. -l、--include=*.ts .",
          en: "source/, app/src/, ./src, . -l, --include=*.ts .",
        },
        mono: true,
        color: "purple",
      },
      {
        tag: "user · tool_result ×5",
        body: { zh: "（五个空字符串）", en: "(five empty strings)" },
        mono: true,
        color: "amber",
      },
    ],
    round: 7,
    stopReason: "tool_use",
    stopTone: "wait",
    tokens: 4820,
    meter: { label: { zh: "已用步数", en: "Steps used" }, used: 7, limit: 8 },
    focus: [[8, 22]],
  },
  {
    action: { zh: "第 8 步：保险丝烧了", en: "Step 8: the fuse blows" },
    title: { zh: "第 8 步：循环被掐断，任务没做完", en: "Step 8: the loop is cut off, the task unfinished" },
    narration: {
      zh:
        "第 8 步的回复里依然是 tool_use——模型还想再找一个目录。" +
        "但 step 已经等于 MAX_STEPS，第 8 行的循环条件不再成立，while 直接退出，" +
        "第 24 到 27 行的善后分支被执行。" +
        "请看清楚这一步和顺利那次的区别：那次是 break 主动退出，因为任务做完了；" +
        "这次是条件不成立被动退出，任务一个字都没完成。" +
        "保险丝做了它该做的事——它没有修好任何东西，只是让这次失败停在五千个 token，而不是五十万个。",
      en:
        "The reply on step 8 is another tool_use: the model wants to try one more directory. But step now " +
        "equals MAX_STEPS, the loop condition on line 8 no longer holds, the while exits, and the cleanup " +
        "branch on lines 24 to 27 runs. Notice the difference between this exit and the clean run: there, " +
        "break was taken because the work was done. Here the loop simply ran out of permission, with nothing " +
        "accomplished. The fuse did its job — it fixed nothing, it only made this failure cost five thousand " +
        "tokens instead of five hundred thousand.",
    },
    faq: {
      q: {
        zh: "把 MAX_STEPS 调大一点，是不是就能跑完了？",
        en: "Would a larger MAX_STEPS let it finish?",
      },
      a: {
        zh: "不会。这次运行里没有任何一步在靠近答案：每一轮拿到的信息量都是零，再给一百轮也还是零。调大保险丝唯一确定的效果，是在同样失败之前多花一百轮的钱。保险丝的正确用法是止损，不是给一个坏掉的循环更多机会。",
        en: "No. Not one step in this run moved closer to an answer: every round returned exactly zero information, and a hundred more rounds would return zero as well. The only certain effect of a larger fuse is spending a hundred rounds' worth of money before failing in the same way. A fuse is for limiting damage, not for giving a broken loop more chances.",
      },
    },
    chat: [
      {
        kind: "assistant",
        text: {
          zh: "还是没有。我再试试 test 目录……",
          en: "Still nothing. Let me try the test directory…",
        },
      },
      { kind: "aside", text: { zh: "循环在这里被 MAX_STEPS 掐断。没有答案返回给用户。", en: "The loop is cut off here by MAX_STEPS. No answer is returned to the user." } },
    ],
    msgs: [
      {
        tag: "assistant · tool_use",
        body: n('{ "command": "grep -rn \\"TODO\\" test/" }'),
        mono: true,
        color: "purple",
      },
    ],
    round: 8,
    stopReason: "MAX_STEPS reached",
    stopTone: "bad",
    tokens: 5510,
    meter: { label: { zh: "已用步数", en: "Steps used" }, used: 8, limit: 8 },
    focus: [
      [8, 8],
      [24, 27],
    ],
  },
  {
    action: { zh: "看看真正的修法", en: "See the actual fix" },
    title: { zh: "要修的是那个工具函数，不是循环", en: "The fix is in the tool, not the loop" },
    narration: {
      zh:
        "把 runCommand 改成连 stderr 和退出码一起返回，整件事就结束了：" +
        "第一轮的 tool_result 会写着「exit 2：src/ 不存在」，模型立刻知道自己猜错的是路径而不是找错了东西，" +
        "第二轮换成 grep -rn TODO . 就拿到了答案。同样的模型、同样的循环、同样的保险丝，" +
        "一轮解决——差别只在于那一条 tool_result 里有没有说实话。" +
        "把这条记下来：agent 的行为质量，上限是你给它的观测质量。",
      en:
        "Make runCommand return stderr and the exit code as well, and the whole thing is over. The first " +
        "tool_result would read \"exit 2: src/ does not exist\", the model would immediately know it guessed " +
        "the path wrong rather than searched an empty project, and the second round — grep -rn TODO . — would " +
        "return the answer. Same model, same loop, same fuse, one round. The only difference is whether that " +
        "one tool_result told the truth. Write this one down: the quality of an agent's behaviour is capped by " +
        "the quality of what you let it observe.",
    },
    chat: [
      { kind: "aside", text: { zh: "同一个循环，改掉工具之后重放：", en: "The same loop, replayed after fixing the tool:" } },
      {
        kind: "user",
        text: {
          zh: "这个项目里还剩多少个 TODO 注释？",
          en: "How many TODO comments are left in this project?",
        },
      },
      { kind: "tool_call", name: "run_command", arg: 'grep -rn "TODO" src/' },
      { kind: "tool_error", text: "exit 2 — grep: src/: No such file or directory" },
      {
        kind: "assistant",
        text: {
          zh: "src 不存在，我从项目根目录找。",
          en: "src does not exist; let me search from the project root.",
        },
      },
      { kind: "tool_call", name: "run_command", arg: 'grep -rn "TODO" .' },
      { kind: "tool_output", text: "app/page.tsx:41:  // TODO: 处理空状态\nlib/build.ts:88:  // TODO: 补一个测试" },
      {
        kind: "assistant",
        text: { zh: "还剩 2 个 TODO，分别在 app/page.tsx 和 lib/build.ts。", en: "Two TODOs are left, in app/page.tsx and lib/build.ts." },
      },
    ],
    msgs: [
      {
        tag: "user",
        body: {
          zh: "这个项目里还剩多少个 TODO 注释？",
          en: "How many TODO comments are left in this project?",
        },
      },
      {
        tag: "user · tool_result",
        body: {
          zh: "exit 2 — grep: src/: No such file or directory",
          en: "exit 2 — grep: src/: No such file or directory",
        },
        mono: true,
        color: "teal",
      },
      {
        tag: "user · tool_result",
        body: n("app/page.tsx:41 · lib/build.ts:88"),
        mono: true,
        color: "teal",
      },
      {
        tag: "assistant",
        body: {
          zh: "还剩 2 个 TODO，分别在 app/page.tsx 和 lib/build.ts。",
          en: "Two TODOs are left, in app/page.tsx and lib/build.ts.",
        },
      },
    ],
    reset: true,
    round: 2,
    stopReason: "end_turn",
    stopTone: "done",
    tokens: 980,
    meter: { label: { zh: "已用步数", en: "Steps used" }, used: 2, limit: 8 },
    focus: [[30, 33]],
  },
];

export const willNotStop: Scenario = {
  id: "will-not-stop",
  name: { zh: "停不下来", en: "It will not stop" },
  tagline: {
    zh: "工具把失败写成了空结果，模型只好一直换地方找。",
    en: "The tool wrote failure as an empty result, so the model kept looking elsewhere.",
  },
  outcome: "fault",
  code,
  steps,
};
