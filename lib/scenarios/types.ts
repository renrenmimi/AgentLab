// 第 2 站「看它怎么跑」的数据结构。
// 一个 Scenario 就是一次完整的 agent 运行，被拆成若干步；每一步描述：
// 触发它的按钮文字（action）、标题（title）、详细讲解（narration）、
// 初学者常见疑问（faq）、追加到对话面板的内容（chat）、
// 追加到透视面板的卡片（msgs），以及这一步对应代码里的哪几行（focus，1 起的闭区间）。

import type { L } from "@/lib/i18n";

// 中英相同的内容（命令输出、JSON 等）用这个包一下
export const n = (s: string): L => ({ zh: s, en: s });

export type ChatItem =
  | { kind: "user"; text: L }
  | { kind: "assistant"; text: L }
  | { kind: "tool_call"; name: string; arg: string }
  | { kind: "tool_output"; text: string }
  | { kind: "tool_error"; text: string }
  // 旁白：不是对话的一部分，而是讲解者插进来的一句话
  | { kind: "aside"; text: L };

export type MsgCard = {
  tag: string;
  body: L;
  mono?: boolean;
  color?: "purple" | "teal" | "amber" | "red";
  sys?: boolean; // system 提示词是单独参数，不占数组下标
  // 卡片体积远大于显示出来的字数时，注明真实大小（历史过长的场景要用）
  weight?: L;
};

// 状态栏里的一根量表：用掉多少 / 上限多少。
// 轮数对 max_iterations、token 对上下文窗口，用的是同一个组件。
export type Meter = {
  label: L;
  used: number;
  limit: number;
  unit?: L;
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
  // 状态徽标的语气。文字本身已经说清是哪种情况，颜色只是加强。
  stopTone?: "wait" | "done" | "bad";
  tokens?: number;
  meter?: Meter;
  // 清空两块面板再执行这一步：用于「换个做法重放一遍」。
  reset?: boolean;
  focus: [number, number][];
};

export type Scenario = {
  id: string;
  name: L;
  tagline: L;
  // 这次运行是顺利收场还是出了问题。选择器上除了颜色还会写出来。
  outcome: "clean" | "fault";
  code: { zh: string[]; en: string[] };
  steps: Step[];
};

// 把第 0..cursor 步的增量数据累积成当前画面。
// 带 reset 的一步表示「清空面板，换个做法重放一遍」，所以从那一步重新开始累积。
// 抽成纯函数是为了让 verify.mjs 能把每个场景逐步走一遍，而不是只在浏览器里目测。
export type PanelState = {
  chat: ChatItem[];
  msgs: MsgCard[];
  round: number;
  stopReason: string | null;
  stopTone: "wait" | "done" | "bad" | null;
  tokens: number;
  meter: Meter | null;
};

export function stateAt(steps: Step[], cursor: number): PanelState {
  let chat: ChatItem[] = [];
  let msgs: MsgCard[] = [];
  let round = 0;
  let stopReason: string | null = null;
  let stopTone: PanelState["stopTone"] = null;
  let tokens = 0;
  let meter: Meter | null = null;

  for (let i = 0; i <= Math.min(cursor, steps.length - 1); i++) {
    const s = steps[i];
    if (s.reset) {
      chat = [];
      msgs = [];
      stopReason = null;
      stopTone = null;
    }
    if (s.chat) chat = chat.concat(s.chat);
    if (s.msgs) msgs = msgs.concat(s.msgs);
    if (s.round !== undefined) round = s.round;
    if (s.stopReason !== undefined) stopReason = s.stopReason;
    if (s.stopTone !== undefined) stopTone = s.stopTone;
    if (s.tokens !== undefined) tokens = s.tokens;
    if (s.meter !== undefined) meter = s.meter;
  }
  return { chat, msgs, round, stopReason, stopTone, tokens, meter };
}
