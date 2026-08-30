// 工具执行失败：命令退出码非零。
// 这一步往数组里写什么——什么都不写、写一句「失败了」、还是把真实报错交回去——
// 决定了模型接下来能想到什么。

import type { Scenario } from "./types";
import { n } from "./types";

const code: Scenario["code"] = {
  zh: [
    'const messages = [{ role: "user", content: task }];',
    "",
    "while (true) {",
    "  const res = await client.messages.create({",
    '    model: "claude-sonnet-5",',
    "    max_tokens: 4096,",
    "    tools,",
    "    messages,",
    "  });",
    '  messages.push({ role: "assistant", content: res.content });',
    '  if (res.stop_reason !== "tool_use") break;',
    '  messages.push({ role: "user", content: await runTools(res.content) });',
    "}",
    "",
    "// 命令失败时这里写什么，决定了模型接下来能想什么。",
    "async function runCommand({ command }) {",
    "  const { code, stdout, stderr } = await exec(command);",
    "",
    "  // 选项 A：吞掉",
    '  // if (code !== 0) return "";',
    "",
    "  // 选项 B：只说一句「失败了」",
    '  // if (code !== 0) return "命令执行失败。";',
    "",
    "  // 选项 C：把真实情况交回去（截断，但注明）",
    "  if (code !== 0) {",
    '    return "exit " + code + "\\n" + stderr.slice(0, 2000);',
    "  }",
    "  return stdout;",
    "}",
  ],
  en: [
    'const messages = [{ role: "user", content: task }];',
    "",
    "while (true) {",
    "  const res = await client.messages.create({",
    '    model: "claude-sonnet-5",',
    "    max_tokens: 4096,",
    "    tools,",
    "    messages,",
    "  });",
    '  messages.push({ role: "assistant", content: res.content });',
    '  if (res.stop_reason !== "tool_use") break;',
    '  messages.push({ role: "user", content: await runTools(res.content) });',
    "}",
    "",
    "// What gets written here on failure decides what the model can think next.",
    "async function runCommand({ command }) {",
    "  const { code, stdout, stderr } = await exec(command);",
    "",
    "  // Option A: swallow it",
    '  // if (code !== 0) return "";',
    "",
    "  // Option B: say only that it failed",
    '  // if (code !== 0) return "The command failed.";',
    "",
    "  // Option C: hand back what happened (capped, and said so)",
    "  if (code !== 0) {",
    '    return "exit " + code + "\\n" + stderr.slice(0, 2000);',
    "  }",
    "  return stdout;",
    "}",
  ],
};

const steps: Scenario["steps"] = [
  {
    title: { zh: "工具会失败，这是常态", en: "Tools fail; that is normal" },
    narration: {
      zh:
        "命令会失败，网络会超时，文件会不存在——这不是异常情况，是日常。" +
        "所以每个 agent 都要回答一个问题：失败的时候，往[[array:数组]]里写什么。" +
        "第 19 到 28 行摆着三个答案：什么都不写、写一句「失败了」、把真实情况交回去。" +
        "三种写法代码量差不多，跑出来的结果差得很远。接下来用同一个任务，把三种都跑一遍。",
      en:
        "Commands fail, networks time out, files are missing. This is not the exceptional case; it is an " +
        "ordinary Tuesday. So every agent has to answer one question: on failure, what goes into the " +
        "[[array:array]]? Lines 19 to 28 hold three answers — write nothing, write that it failed, or hand " +
        "back what actually happened. They are about the same amount of code and produce very different runs. " +
        "What follows is the same task under each of them.",
    },
    msgs: [
      {
        tag: "system",
        body: {
          zh: "你是一个开发助手，可以用 run_command 执行命令。",
          en: "You are a developer assistant; you can run commands with run_command.",
        },
        sys: true,
      },
    ],
    round: 0,
    tokens: 0,
    focus: [[15, 30]],
  },
  {
    action: { zh: "发送任务", en: "Send the task" },
    title: { zh: "跑一下测试", en: "Run the tests" },
    narration: {
      zh:
        "任务：跑测试，告诉我哪里坏了。" +
        "这个任务的价值几乎全在「哪里」两个字上——只回答「有测试挂了」，等于什么都没说。" +
        "记住这一点，等下对照三种做法。",
      en:
        "The task: run the tests and tell me what is broken. Nearly all the value of this task sits in the " +
        "word what — an answer of \"some tests failed\" is worth almost nothing. Keep that in mind while " +
        "comparing the three options.",
    },
    chat: [
      {
        kind: "user",
        text: {
          zh: "跑一下测试，告诉我哪里坏了。",
          en: "Run the tests and tell me what is broken.",
        },
      },
    ],
    msgs: [
      {
        tag: "user",
        body: {
          zh: "跑一下测试，告诉我哪里坏了。",
          en: "Run the tests and tell me what is broken.",
        },
      },
    ],
    round: 0,
    focus: [[1, 1]],
  },
  {
    action: { zh: "第 1 轮：执行 npm test", en: "Round 1: run npm test" },
    title: { zh: "命令失败了，退出码 1", en: "The command fails with exit code 1" },
    narration: {
      zh:
        "模型请求 run_command(\"npm test\")，你的代码执行，jest 报了一个断言失败：" +
        "退出码 1，stderr 里有测试名、期望值、实际值和行号。" +
        "到这里为止，真实世界的信息是完整的——它就摆在你的进程里。" +
        "接下来那一行代码，决定这些信息有多少能进到数组里。",
      en:
        "The model asks for run_command(\"npm test\"), your code runs it, and jest reports one failed " +
        "assertion: exit code 1, with the test name, the expected value, the received value and a line number " +
        "on stderr. Up to this point the real-world information is complete — it is sitting in your process. " +
        "The next line of code decides how much of it reaches the array.",
    },
    chat: [
      { kind: "assistant", text: { zh: "我来跑测试。", en: "Let me run the tests." } },
      { kind: "tool_call", name: "run_command", arg: "npm test" },
      {
        kind: "tool_error",
        text:
          "exit 1\nFAIL  lib/cart.test.ts\n  ● applies the member discount\n    expect(received).toBe(expected)\n    Expected: 90\n    Received: 100\n      at lib/cart.test.ts:31:24",
      },
    ],
    msgs: [
      {
        tag: "assistant · tool_use",
        body: n('{ "command": "npm test" }'),
        mono: true,
        color: "purple",
      },
    ],
    round: 1,
    stopReason: "tool_use",
    stopTone: "wait",
    tokens: 480,
    focus: [[16, 17]],
  },
  {
    action: { zh: "选项 A：什么都不写", en: "Option A: write nothing" },
    title: { zh: "选项 A：吞掉错误，换来一句自信的假话", en: "Option A: swallow it, and get a confident falsehood" },
    narration: {
      zh:
        "第 20 行：失败就返回空字符串。数组里那条 tool_result 是空的，" +
        "而空读起来像「命令跑完了，没有输出」——测试全过，通常正是没什么输出。" +
        "模型据此回答「测试都通过了」，stop_reason 是 end_turn，程序正常退出。" +
        "这是三种做法里最糟的一种：它不但没解决问题，还生产了一句与事实相反的话，" +
        "而且从外面看，它和一次成功的运行长得一模一样。",
      en:
        "Line 20: on failure, return an empty string. The tool_result in the array is empty, and empty reads " +
        "like \"the command finished and printed nothing\" — which is what a fully passing suite often looks " +
        "like. So the model reports that the tests pass, stop_reason is end_turn, and the program exits " +
        "normally. This is the worst of the three: it does not merely fail to solve the problem, it " +
        "manufactures a statement that is the reverse of the truth, and from the outside it looks exactly " +
        "like a successful run.",
    },
    faq: {
      q: { zh: "为什么会有人这么写？", en: "Why would anyone write this?" },
      a: {
        zh: "很少有人是故意的。它通常来自一个看起来很稳妥的 try/catch：把异常接住，返回一个空值，免得整个程序崩掉。在普通程序里这是好习惯；在 agent 里，被吞掉的异常不会消失，它会变成模型眼中的「一切正常」，然后以一句自信的结论重新出现在用户面前。",
        en: "Almost nobody does it deliberately. It usually arrives as a sensible-looking try/catch: swallow the exception, return an empty value, keep the program from crashing. In ordinary code that is a good habit. In an agent, a swallowed exception does not disappear — it becomes \"everything is fine\" as far as the model can see, and returns to the user as a confident conclusion.",
      },
    },
    chat: [
      { kind: "aside", text: { zh: "选项 A：if (code !== 0) return \"\";", en: 'Option A: if (code !== 0) return "";' } },
      {
        kind: "assistant",
        text: { zh: "测试都通过了，没有发现问题。", en: "All tests passed; nothing is broken." },
      },
      {
        kind: "aside",
        text: {
          zh: "事实是有一个测试挂了。程序没有报错，用户也没有理由怀疑。",
          en: "In fact one test failed. Nothing errored, and the user has no reason to doubt it.",
        },
      },
    ],
    msgs: [
      {
        tag: "user · tool_result",
        body: { zh: "（空字符串）", en: "(empty string)" },
        mono: true,
        color: "red",
      },
      {
        tag: "assistant",
        body: { zh: "测试都通过了。（与事实相反）", en: "All tests passed. (the reverse of the truth)" },
        color: "red",
      },
    ],
    round: 2,
    stopReason: "end_turn",
    stopTone: "bad",
    tokens: 760,
    focus: [[19, 20]],
  },
  {
    action: { zh: "选项 B：只说失败了", en: "Option B: say only that it failed" },
    title: { zh: "选项 B：诚实，但没有用", en: "Option B: honest, and useless" },
    narration: {
      zh:
        "第 23 行：失败就返回「命令执行失败。」。这句话是真的，模型不会再撒谎，" +
        "但它不足以回答问题——「哪里坏了」需要测试名和行号，这句话一个都没有。" +
        "于是模型做了一件合理的事：加上 --verbose 再跑一次，指望多看到点东西。" +
        "结果当然还是同一句话。多花一轮，多花一份钱，什么都没多知道。" +
        "这里的浪费不是因为模型笨，而是你把一份已经拿到手的信息扔了，再花钱让它去猜。",
      en:
        "Line 23: on failure, return \"The command failed.\" That sentence is true, so the model no longer " +
        "lies, but it cannot answer the question — what is broken needs a test name and a line number, and " +
        "this sentence has neither. So the model does something reasonable: run it again with --verbose and " +
        "hope for more. The reply is of course the same sentence. One more round, one more bill, nothing more " +
        "learned. The waste is not the model being slow; it is you discarding information you already held, " +
        "and then paying the model to guess at it.",
    },
    chat: [
      { kind: "aside", text: { zh: "选项 B：if (code !== 0) return \"命令执行失败。\";", en: 'Option B: if (code !== 0) return "The command failed.";' } },
      {
        kind: "user",
        text: {
          zh: "跑一下测试，告诉我哪里坏了。",
          en: "Run the tests and tell me what is broken.",
        },
      },
      { kind: "tool_call", name: "run_command", arg: "npm test" },
      {
        kind: "assistant",
        text: {
          zh: "命令失败了，但没有细节。我加上 --verbose 再跑一次。",
          en: "It failed but gave no detail. Let me run it again with --verbose.",
        },
      },
      { kind: "tool_call", name: "run_command", arg: "npm test -- --verbose" },
      { kind: "tool_output", text: "The command failed." },
      {
        kind: "assistant",
        text: {
          zh: "测试没能通过，但我拿不到具体是哪个用例失败。建议你在本地手动跑一次看看输出。",
          en: "The tests did not pass, but I cannot tell which case failed. You may want to run them locally and read the output.",
        },
      },
    ],
    msgs: [
      {
        tag: "user",
        body: {
          zh: "跑一下测试，告诉我哪里坏了。",
          en: "Run the tests and tell me what is broken.",
        },
      },
      {
        tag: "user · tool_result ×2",
        body: { zh: "命令执行失败。（两次都是这一句）", en: "The command failed. (twice, identically)" },
        mono: true,
        color: "amber",
      },
      {
        tag: "assistant",
        body: {
          zh: "没能通过，但说不出是哪个用例。（多花了一轮）",
          en: "Did not pass, cannot say which case. (one extra round spent)",
        },
        color: "amber",
      },
    ],
    reset: true,
    round: 3,
    stopReason: "end_turn",
    stopTone: "bad",
    tokens: 1240,
    focus: [[22, 23]],
  },
  {
    action: { zh: "选项 C：把真实情况交回去", en: "Option C: hand back what happened" },
    title: { zh: "选项 C：一轮就说清了", en: "Option C: answered in one round" },
    narration: {
      zh:
        "第 26 到 28 行：把退出码和 stderr 一起返回，并且用 slice 截到两千字符以内。" +
        "模型这一轮就拿到了测试名、期望值 90、实际值 100 和行号 31，" +
        "回答里直接点名 lib/cart.test.ts 的会员折扣用例，还能顺带指出折扣压根没被应用。" +
        "同样一条失败的命令，同样一个模型，同样一个循环——" +
        "差别只在于你有没有把已经握在手里的事实写进数组。",
      en:
        "Lines 26 to 28: return the exit code together with stderr, capped at two thousand characters with " +
        "slice. In this one round the model receives the test name, expected 90, received 100, and " +
        "lib/cart.test.ts:31, and its answer names the member-discount case and points out that the discount is " +
        "not being applied at all. The same failing command, the same model, the same loop. The only " +
        "difference is whether you wrote a fact you already held into the array.",
    },
    faq: {
      q: {
        zh: "把报错原样发回去，有什么要小心的？",
        en: "What should you be careful about when passing errors back?",
      },
      a: {
        zh: "两件事。一是体积：栈追踪和构建日志能轻易到几万行，所以第 27 行有那个 slice——截断本身没问题，注明截断了就行。二是内容：报错里可能带着绝对路径、内网地址、连接串甚至密钥，而这些一旦进了数组，就会跟着之后每一轮一起发出去。该做的是过滤敏感字段，不是退回去用「失败了」三个字。",
        en: "Two things. Size: stack traces and build logs reach tens of thousands of lines easily, which is why line 27 has that slice — capping is fine as long as you say you capped it. And content: error text can carry absolute paths, internal hostnames, connection strings, even credentials, and once any of that is in the array it is resent with every later round. The answer is to filter the sensitive fields, not to retreat to \"it failed\".",
      },
    },
    chat: [
      { kind: "aside", text: { zh: "选项 C：return \"exit \" + code + \"\\n\" + stderr.slice(0, 2000);", en: 'Option C: return "exit " + code + "\\n" + stderr.slice(0, 2000);' } },
      {
        kind: "user",
        text: {
          zh: "跑一下测试，告诉我哪里坏了。",
          en: "Run the tests and tell me what is broken.",
        },
      },
      { kind: "tool_call", name: "run_command", arg: "npm test" },
      {
        kind: "tool_error",
        text:
          "exit 1\nFAIL  lib/cart.test.ts\n  ● applies the member discount\n    Expected: 90\n    Received: 100\n      at lib/cart.test.ts:31:24",
      },
      {
        kind: "assistant",
        text: {
          zh: "挂的是 lib/cart.test.ts 第 31 行的 applies the member discount：期望 90，实际 100，看起来会员折扣根本没被应用到总价上。",
          en: "The failing test is applies the member discount at lib/cart.test.ts:31 — expected 90, received 100, so the member discount is not being applied to the total at all.",
        },
      },
    ],
    msgs: [
      {
        tag: "user",
        body: {
          zh: "跑一下测试，告诉我哪里坏了。",
          en: "Run the tests and tell me what is broken.",
        },
      },
      {
        tag: "user · tool_result",
        body: {
          zh: "exit 1 — FAIL lib/cart.test.ts ● applies the member discount，期望 90 实际 100，第 31 行",
          en: "exit 1 — FAIL lib/cart.test.ts ● applies the member discount, expected 90 received 100, line 31",
        },
        mono: true,
        color: "teal",
      },
      {
        tag: "assistant",
        body: {
          zh: "lib/cart.test.ts:31 会员折扣用例失败，折扣没有被应用",
          en: "lib/cart.test.ts:31, member discount case failing; the discount is not applied",
        },
      },
    ],
    reset: true,
    round: 2,
    stopReason: "end_turn",
    stopTone: "done",
    tokens: 890,
    focus: [[25, 28]],
  },
  {
    action: { zh: "把三种做法放在一起", en: "Put the three side by side" },
    title: { zh: "工具结果是模型唯一的感官", en: "A tool result is the model's only sense organ" },
    narration: {
      zh:
        "三次运行的模型、循环、任务完全一样，只有一行代码不同，结果是：" +
        "A 交付了一句反过来的结论，B 多花一轮仍说不出所以然，C 一轮点名到行。" +
        "把这条记下来：模型对外部世界的全部感知，就是你写进 tool_result 的那段文字。" +
        "蒙住它的眼睛，它不会说「我看不见」，它会自信地描述它以为看到的东西。" +
        "所以「失败时返回什么」不是错误处理的细节，它就是 agent 能力本身的一部分。",
      en:
        "Three runs with the same model, the same loop and the same task, differing by one line of code: A " +
        "delivered a conclusion that was the reverse of the truth, B spent an extra round and still could not " +
        "say why, C named the file and the line in one. Write this down: everything the model perceives of " +
        "the outside world is the text you wrote into a tool_result. Cover its eyes and it will not say that " +
        "it cannot see; it will confidently describe what it believes is there. Which is why what you return " +
        "on failure is not a detail of error handling — it is part of what the agent is able to do at all.",
    },
    chat: [
      {
        kind: "aside",
        text: {
          zh: "A 吞掉 → 「测试都通过了」（假）　·　B 只说失败 → 多一轮，仍说不清（无用）　·　C 交回真实报错 → 一轮点名到行（有用）",
          en: "A swallow → \"all tests passed\" (false)  ·  B say it failed → an extra round, still cannot say what (useless)  ·  C hand back the error → named to the line in one round (useful)",
        },
      },
    ],
    focus: [[15, 30]],
  },
];

export const toolFails: Scenario = {
  id: "tool-fails",
  name: { zh: "工具执行失败", en: "The tool fails" },
  tagline: {
    zh: "退出码非零，往数组里写什么？三种写法，三种结局。",
    en: "A non-zero exit. What goes into the array? Three answers, three outcomes.",
  },
  outcome: "fault",
  code,
  steps,
};
