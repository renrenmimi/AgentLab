"use client";

// 极简双语方案：一个 context 存当前语言（localStorage 持久化），
// 所有文案都是 { zh, en } 成对出现，用 t() 取当前语言的那份。

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "zh" | "en";
export type L = { zh: string; en: string };

export const t = (l: L, lang: Lang) => l[lang];

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const LangContext = createContext<Ctx>({ lang: "zh", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>("zh");

  useEffect(() => {
    const saved = window.localStorage.getItem("agentlab-lang");
    if (saved === "en" || saved === "zh") {
      set(saved);
      document.documentElement.lang = saved === "zh" ? "zh-CN" : "en";
    }
  }, []);

  const setLang = (l: Lang) => {
    set(l);
    window.localStorage.setItem("agentlab-lang", l);
    document.documentElement.lang = l === "zh" ? "zh-CN" : "en";
  };

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

// ---------- 界面通用文案 ----------

export const ui = {
  nav: {
    brandSub: { zh: "看得见的 Agent", en: "See Inside the Agent" },
    stop1: { zh: "什么是 Agent", en: "What is an Agent" },
    stop2: { zh: "看它怎么跑", en: "Watch It Run" },
    stop3: { zh: "亲手写一个", en: "Write One Yourself" },
  },

  common: {
    reset: { zh: "重置", en: "Reset" },
    autoplay: { zh: "自动播放", en: "Auto-play" },
    pause: { zh: "暂停", en: "Pause" },
    replay: { zh: "↻ 重新播放", en: "↻ Replay" },
    kbdNext: { zh: "下一步", en: "next" },
    kbdPrev: { zh: "上一步", en: "back" },
    kbdSpace: { zh: "空格", en: "Space" },
  },

  intro: {
    title: { zh: "第 1 站 · 什么是 Agent？", en: "Stop 1 · What is an Agent?" },
    subtitle: {
      zh: "六幕小动画，只要你写过一次 print(\"hello world\") 就能看懂",
      en: "Six short animated scenes — if you’ve ever written print(\"hello world\"), you’re ready",
    },
    sceneWord: { zh: "第", en: "Scene" }, // zh: 第 X 幕 / en: Scene X
    toLoop: { zh: "下一站：看它怎么跑 →", en: "Next stop: watch it run →" },
    kbdNext: { zh: "下一幕", en: "next scene" },
    kbdPrev: { zh: "上一幕", en: "back" },
  },

  loop: {
    title: {
      zh: "第 2 站 · 看它怎么跑（慢动作）",
      en: "Stop 2 · Watch It Run (in slow motion)",
    },
    subtitle: {
      zh: "每按一次按钮，就推进真实流程中的一拍——按钮上写的就是下一拍",
      en: "Each press advances one beat of the real flow — the button label IS the next beat",
    },
    chatTitle: {
      zh: "对话 —— 普通人看到的样子",
      en: "Chat — what a normal user sees",
    },
    xrayTitle: {
      zh: "透视 —— 发给 API 的 messages 数组",
      en: "X-ray — the messages array sent to the API",
    },
    empty: {
      zh: "还没有任何消息 —— 先「发送任务」",
      en: "No messages yet — start with “Send the task”",
    },
    toolReq: { zh: "工具调用请求", en: "Tool call request" },
    pending: { zh: "等待你执行", en: "waiting for you" },
    sysIdx: { zh: "参数", en: "param" },
    faqLabel: { zh: "小白疑问", en: "Beginner question" },
    codeTitle: {
      zh: "代码对照 —— 刚才那一步，就是这几行",
      en: "The code — that step was exactly these lines",
    },
    codeNote: {
      zh: "这 31 行就是一个 agent 的完整骨架，没有省略关键步骤。下一站你会亲手把它写出来。",
      en: "These 31 lines are a complete agent skeleton — nothing essential omitted. Next stop, you write it yourself.",
    },
    lines: { zh: "共 31 行", en: "31 lines" },
    toBuild: { zh: "下一站：亲手写一个 →", en: "Next stop: write one yourself →" },
  },

  build: {
    title: { zh: "第 3 站 · 亲手写一个", en: "Stop 3 · Write One Yourself" },
    subtitle: {
      zh: "骨架已经搭好，8 个关键的空由你来填——每个空需要的新知识会先教给你，填错了我会告诉你为什么",
      en: "The skeleton is ready — you fill the 8 key blanks. Each one teaches you the concept it needs first; wrong answers get explained",
    },
    lessonLabel: { zh: "新知识", en: "New concept" },
    blankWord: { zh: "第", en: "Blank" }, // zh: 第 X 空 / en: Blank X
    submit: { zh: "填进去", en: "Fill it in" },
    hint: { zh: "要个提示", en: "Give me a hint" },
    reveal: { zh: "看答案", en: "Show answer" },
    answerIs: { zh: "答案是", en: "The answer is" },
    readyTitle: {
      zh: "全部填对了——现在让它跑起来",
      en: "All 8 correct — now make it run",
    },
    readyBody: {
      zh: "下面这份 agent.js 的每一个关键处都是你亲手填的。点「运行」，看看它怎么完成“看看这个文件夹里有什么”这个任务。",
      en: "Every key piece of this agent.js was typed by you. Hit “Run” and watch it complete the task: “look around this folder”.",
    },
    runBtn: { zh: "▶ 运行你的 agent", en: "▶ Run your agent" },
    doneTitle: {
      zh: "🎉 跑通了！你刚刚写出了一个 agent",
      en: "🎉 It works! You just wrote an agent",
    },
    again: { zh: "↻ 再写一遍", en: "↻ Write it again" },
    backLoop: { zh: "回看慢动作", en: "Rewatch slow motion" },
    backIntro: { zh: "回到第 1 站", en: "Back to Stop 1" },
    codeTitle: {
      zh: "agent.js —— 你正在写的文件",
      en: "agent.js — the file you’re writing",
    },
    filled: { zh: "已完成", en: "filled" }, // 已完成 X/8 个空 / X/8 blanks filled
    blanksWord: { zh: "个空", en: "blanks" },
    codeNote: {
      zh: "灰色的 ____ 是还没轮到的空。当前要填的空就在发光的那一行——直接在上面的输入框里作答。",
      en: "Grey ____ are blanks yet to come. The glowing line holds the current blank — answer in the input box above.",
    },
  },
};
