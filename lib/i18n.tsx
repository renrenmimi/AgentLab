"use client";

// 极简双语方案：一个 context 存当前语言（localStorage 持久化），
// 所有文案都是 { zh, en } 成对出现，用 t() 取当前语言的那份。
// 默认英文；中文通过工具条的「中 / EN」切换，选择存 localStorage。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "zh" | "en";
export type L = { zh: string; en: string };

export const t = (l: L, lang: Lang) => l[lang];

const KEY = "agentlab-lang";

// 在 <head> 里、首帧之前运行：把存下来的语言写到 <html> 上，
// 这样首次绘制就已经是正确的语言，不会闪一下中文。默认 "en"。
export const langScript = `(function(){var d=document.documentElement;var l="en";try{if(localStorage.getItem("${KEY}")==="zh")l="zh";}catch(e){}d.dataset.lang=l;d.lang=l==="zh"?"zh-CN":"en";})();`;

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const LangContext = createContext<Ctx>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>("en");

  // 跟无闪脚本已经写好的值对齐（脚本没跑成功时回退读 localStorage）。
  useEffect(() => {
    const applied = document.documentElement.dataset.lang;
    if (applied === "zh" || applied === "en") {
      set(applied);
      return;
    }
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "zh" || saved === "en") set(saved);
    } catch {
      /* ignore read failures (private mode, etc.) */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    set(l);
    const d = document.documentElement;
    d.dataset.lang = l;
    d.lang = l === "zh" ? "zh-CN" : "en";
    try {
      window.localStorage.setItem(KEY, l);
    } catch {
      /* ignore write failures (private mode, etc.) */
    }
  }, []);

  return (
    <LangContext.Provider
      value={useMemo(() => ({ lang, setLang }), [lang, setLang])}
    >
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

// ---------- 界面通用文案 ----------

export const ui = {
  nav: {
    stop1: { zh: "什么是 Agent", en: "What is an agent" },
    stop2: { zh: "看它怎么跑", en: "Watch it run" },
    stop3: { zh: "亲手写一个", en: "Write one yourself" },
  },

  // ---------- Research OS shell (sidebar / toolbar / command palette) ----------
  brand: {
    name: { zh: "AgentLab", en: "AgentLab" },
    tagline: {
      zh: "看得见的 Agent",
      en: "See inside the agent",
    },
  },
  side: {
    status: { zh: "STATUS", en: "STATUS" },
    progress: { zh: "三站学习闭环", en: "Three stops, one loop" },
  },
  toolbar: {
    hideNav: { zh: "隐藏导航栏", en: "Hide navigation" },
    showNav: { zh: "显示导航栏", en: "Show navigation" },
    search: { zh: "搜索 / Search…", en: "Search…" },
  },
  cmdk: {
    placeholder: { zh: "搜索三站 / Search…", en: "Search the three stops…" },
    empty: { zh: "没有匹配项", en: "No matches" },
    navHint: {
      zh: "↑↓ 选择 · ↵ 跳转 · esc 关闭",
      en: "↑↓ select · ↵ open · esc close",
    },
  },
  theme: {
    toDark: { zh: "切到深色模式", en: "Switch to dark mode" },
    toLight: { zh: "切到浅色模式", en: "Switch to light mode" },
  },

  common: {
    reset: { zh: "重置", en: "Reset" },
    autoplay: { zh: "自动播放", en: "Auto-play" },
    pause: { zh: "暂停", en: "Pause" },
    replay: { zh: "↻ 重新播放", en: "↻ Replay" },
    kbdNext: { zh: "下一步", en: "next step" },
    kbdPrev: { zh: "上一步", en: "back" },
    kbdSpace: { zh: "空格", en: "Space" },
  },

  // 面板 / 控件的无障碍标签（读屏用，界面上看不见）
  a11y: {
    progress: { zh: "进度", en: "Progress" },
    chatPanel: { zh: "对话面板", en: "Chat panel" },
    xrayPanel: { zh: "messages 数组透视面板", en: "Messages array panel" },
    codePanel: { zh: "代码面板", en: "Code panel" },
    answerInput: { zh: "你的答案", en: "Your answer" },
    runOutput: { zh: "运行输出", en: "Run output" },
    stops: { zh: "三站导航", en: "Stops" },
  },

  intro: {
    title: { zh: "第 1 站 · 什么是 Agent？", en: "Stop 1 · What is an agent?" },
    subtitle: {
      zh: "六幕小动画。只要你写过一次 print(\"hello world\")，就能看懂",
      en: "Six short scenes. If you have written print(\"hello world\") once, you have enough background to follow them.",
    },
    toLoop: { zh: "下一站：看它怎么跑 →", en: "Next stop: watch it run →" },
    kbdNext: { zh: "下一幕", en: "next scene" },
    kbdPrev: { zh: "上一幕", en: "back" },
  },

  loop: {
    title: {
      zh: "第 2 站 · 看它怎么跑（慢动作）",
      en: "Stop 2 · Watch it run, in slow motion",
    },
    subtitle: {
      zh: "每按一次按钮，就推进真实流程中的一步——按钮上写的就是这一步做什么",
      en: "Each press advances the real run by one step. The button label says what that step does.",
    },
    chatTitle: {
      zh: "对话 —— 普通人看到的样子",
      en: "Chat — what the user sees",
    },
    xrayTitle: {
      zh: "透视 —— 发给 API 的 messages 数组",
      en: "X-ray — the messages array sent to the API",
    },
    empty: {
      zh: "还没有任何消息 —— 先「发送任务」",
      en: "No messages yet. Start with \"Send the task\".",
    },
    toolReq: { zh: "工具调用请求", en: "Tool call request" },
    pending: { zh: "等待你执行", en: "waiting for your code" },
    sysIdx: { zh: "参数", en: "parameter" },
    faqLabel: { zh: "常见疑问", en: "Beginner question" },
    faqSep: { zh: "：", en: ": " },
    codeTitle: {
      zh: "代码对照 —— 刚才那一步，就是这几行",
      en: "The code — that step was these lines",
    },
    codeNote: {
      zh: "这 32 行就是一个 agent 的完整骨架，没有省略关键步骤。下一站你会亲手把它写出来。",
      en: "These 32 lines are a complete agent. Nothing essential is left out. At the next stop you write them yourself.",
    },
    lines: { zh: "共 32 行", en: "32 lines" },
    toBuild: { zh: "下一站：亲手写一个 →", en: "Next stop: write one yourself →" },
  },

  build: {
    title: { zh: "第 3 站 · 亲手写一个", en: "Stop 3 · Write one yourself" },
    subtitle: {
      zh: "骨架已经搭好，8 个关键的空由你来填。每个空需要的新知识会先教给你，答错时会给出针对性的说明",
      en: "The skeleton is ready. You fill in the 8 key blanks. Each blank teaches the concept it needs before it asks, and a wrong answer gets a specific explanation.",
    },
    lessonLabel: { zh: "新知识", en: "New concept" },
    submit: { zh: "填进去", en: "Fill it in" },
    hint: { zh: "查看提示", en: "Show a hint" },
    reveal: { zh: "看答案", en: "Show the answer" },
    answerIs: { zh: "答案是", en: "The answer is" },
    notQuite: { zh: "不太对。", en: "Not quite. " },
    terminal: { zh: "终端", en: "terminal" },
    readyTitle: {
      zh: "全部填对了——现在让它跑起来",
      en: "All 8 are correct. Now run it.",
    },
    readyBody: {
      zh: "下面这份 agent.js 的每一个关键处都是你亲手填的。点「运行」，看它怎么完成“看看这个文件夹里有什么”这个任务。",
      en: "Every key piece of this agent.js was typed by you. Press Run and watch it finish the task: look around this folder.",
    },
    runBtn: { zh: "▶ 运行你的 agent", en: "▶ Run your agent" },
    doneTitle: {
      zh: "🎉 跑通了！你刚刚写出了一个 agent",
      en: "🎉 It works. You just wrote an agent",
    },
    again: { zh: "↻ 再写一遍", en: "↻ Write it again" },
    backLoop: { zh: "回看慢动作", en: "Watch the slow motion again" },
    backIntro: { zh: "回到第 1 站", en: "Back to stop 1" },
    codeTitle: {
      zh: "agent.js —— 你正在写的文件",
      en: "agent.js — the file you are writing",
    },
    codeNote: {
      zh: "灰色的 ____ 是还没轮到的空。当前要填的空就在发光的那一行——直接在上面的输入框里作答。",
      en: "The grey ____ are blanks that come later. The glowing line holds the current blank. Answer it in the input box above.",
    },
  },
};
