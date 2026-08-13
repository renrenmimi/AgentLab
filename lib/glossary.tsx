"use client";

// 初学者术语词典：正文里写 [[key:显示文字]]，RichText 会把它渲染成
// 带虚线下划线的可点击术语，点开是一段“小朋友也能懂”的解释。

import { useState, type ReactNode } from "react";
import { t, type L, type Lang } from "@/lib/i18n";

export const glossary: Record<string, { word: L; def: L }> = {
  api: {
    word: { zh: "API", en: "API" },
    def: {
      zh: "别人搭好的“服务窗口”：你的程序把请求通过网络发过去，它把结果发回来。Claude API 就是一个“文字进、文字出”的窗口。",
      en: "A service counter run by someone else: your program sends a request over the internet, and a result comes back. The Claude API is a counter where text goes in and text comes out.",
    },
  },
  array: {
    word: { zh: "数组", en: "array" },
    def: {
      zh: "一排带编号的格子，可以一直往后追加新格子。写作 [ ]，比如 [\"苹果\", \"香蕉\"] 是两格。",
      en: "A row of numbered slots you can keep appending to. Written [ ], e.g. [\"apple\", \"banana\"] has two slots.",
    },
  },
  push: {
    word: { zh: "push", en: "push" },
    def: {
      zh: "往数组末尾加一格。messages.push(x) 就是把 x 放到最后一格。",
      en: "Append one slot to the end of an array. messages.push(x) puts x in the last slot.",
    },
  },
  object: {
    word: { zh: "对象", en: "object" },
    def: {
      zh: "带标签的小盒子：{ 标签: 内容 }。比如 { role: \"user\", content: \"你好\" } 有两个标签。",
      en: "A labeled box: { label: value }. For example { role: \"user\", content: \"hi\" } has two labels.",
    },
  },
  token: {
    word: { zh: "token", en: "token" },
    def: {
      zh: "模型计量文本长度的单位，大致相当于一个词。发的内容越长 token 越多——越贵、也越慢。",
      en: "The unit models use to count text — roughly one per word. More text means more tokens: pricier and slower.",
    },
  },
  stateless: {
    word: { zh: "无状态", en: "stateless" },
    def: {
      zh: "每次请求处理完就不保留任何状态。API 不记得上一次的任何事，所以每次都要把完整历史重新发一遍。",
      en: "Forgets everything after each request. The API remembers nothing, so you must resend the full history every time.",
    },
  },
};

const RE = /\[\[(\w+):([^\]]+)\]\]/g;

// 把带 [[key:文字]] 标记的文案渲染成正文 + 可点击术语
export function RichText({ text, lang }: { text: string; lang: Lang }) {
  const parts: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(RE)) {
    const idx = m.index!;
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(<Term key={k++} termKey={m[1]} display={m[2]} lang={lang} />);
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function Term({
  termKey,
  display,
  lang,
}: {
  termKey: string;
  display: string;
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const entry = glossary[termKey];
  if (!entry) return <>{display}</>;
  return (
    <span className="term-wrap">
      <button
        type="button"
        className={`term ${open ? "term-on" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        {display}
      </button>
      {open && (
        <span className="term-pop" role="tooltip">
          <b>{t(entry.word, lang)}</b>
          {t(entry.def, lang)}
        </span>
      )}
    </span>
  );
}
