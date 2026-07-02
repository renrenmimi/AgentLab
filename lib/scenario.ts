// 模拟模式的"录制数据"：一次 agent 运行被拆成若干步。
// 每一步描述：触发它的按钮文字（action）、讲解文案（narration）、
// 追加到左侧对话面板的内容（chat）、追加到右侧 messages 数组的卡片（msgs）。

export type ChatItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool_call"; name: string; arg: string }
  | { kind: "tool_output"; text: string };

export type MsgCard = {
  tag: string;
  body: string;
  mono?: boolean;
  color?: "purple" | "teal";
};

export type Step = {
  action?: string;
  narration: string;
  chat?: ChatItem[];
  msgs?: MsgCard[];
  round?: number;
  stopReason?: string;
  tokens?: number;
};

export const steps: Step[] = [
  {
    narration:
      "这是发给 API 的 messages 数组的最初状态：只有一条 system 提示词。agent 的一切都围绕这个数组展开——接下来你每按一次按钮，就推进真实流程中的一步。",
    msgs: [
      {
        tag: "system",
        body: "你是一个本地文件助手，可以用工具查看目录和读取文件。",
      },
    ],
    round: 0,
    tokens: 0,
  },
  {
    action: "发送任务",
    narration:
      "你的任务变成了数组里的一条 user 消息。注意：模型此刻还一无所知——数组还没有发出去。",
    chat: [{ kind: "user", text: "看看这个文件夹里有什么，告诉我这个项目是干嘛的" }],
    msgs: [{ tag: "user", body: "看看这个文件夹里有什么，告诉我这个项目是干嘛的" }],
  },
  {
    action: "把整个数组发给模型（第 1 轮）",
    narration:
      "模型的回复里出现了一个 tool_use 块——它在“请求”调用工具。关键点：模型自己什么都没有执行，stop_reason: tool_use 的意思是“该你了”。",
    chat: [
      { kind: "assistant", text: "我先看看目录里有什么。" },
      { kind: "tool_call", name: "run_command", arg: "ls" },
    ],
    msgs: [
      {
        tag: "assistant · tool_use",
        body: '{ "command": "ls" }',
        mono: true,
        color: "purple",
      },
    ],
    round: 1,
    stopReason: "tool_use",
    tokens: 486,
  },
  {
    action: "执行工具：ls",
    narration:
      "命令是你的代码在你的电脑上跑的。模型永远碰不到你的文件系统——它只会收到你贴回数组里的这段文字（tool_result）。",
    chat: [{ kind: "tool_output", text: "app/  components/  lib/  package.json  README.md" }],
    msgs: [
      {
        tag: "user · tool_result",
        body: "app/  components/  lib/  package.json  README.md",
        mono: true,
        color: "teal",
      },
    ],
  },
  {
    action: "把结果发回模型（第 2 轮）",
    narration:
      "每一轮都是把“越来越长的整个数组”重新发一遍——API 本身没有记忆，所谓记忆就是这个数组本身。",
    chat: [
      { kind: "assistant", text: "有 package.json，读一下就知道这个项目是干嘛的了。" },
      { kind: "tool_call", name: "read_file", arg: "package.json" },
    ],
    msgs: [
      {
        tag: "assistant · tool_use",
        body: '{ "path": "package.json" }',
        mono: true,
        color: "purple",
      },
    ],
    round: 2,
    stopReason: "tool_use",
    tokens: 1120,
  },
  {
    action: "执行工具：read_file",
    narration:
      "又是同样的两拍：执行发生在本地，结果进数组。你大概已经看出规律了——agent 就是在不断重复这个节奏。",
    chat: [
      {
        kind: "tool_output",
        text: '{ "name": "agentlab", "scripts": { "dev": "next dev" }, "dependencies": { "next": "15.x", "react": "19.x" } }',
      },
    ],
    msgs: [
      {
        tag: "user · tool_result",
        body: '{ "name": "agentlab", ... }',
        mono: true,
        color: "teal",
      },
    ],
  },
  {
    action: "把结果发回模型（第 3 轮）",
    narration:
      "这次回复里没有 tool_use 了，stop_reason 变成 end_turn——循环条件不满足，agent 停止。恭喜，这就是 agent 的全部秘密：一个数组 + 一个循环。",
    chat: [
      {
        kind: "assistant",
        text: "这是一个叫 AgentLab 的 Next.js 项目：一个把 AI agent 的运行过程做成可视化教学的网站——你现在看到的这个页面，就是它自己。",
      },
    ],
    msgs: [
      {
        tag: "assistant",
        body: "这是一个叫 AgentLab 的 Next.js 项目：一个把 agent 运行过程可视化的教学网站……",
      },
    ],
    round: 3,
    stopReason: "end_turn",
    tokens: 1834,
  },
];
