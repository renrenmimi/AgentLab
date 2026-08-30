"use client";

// 初学者术语词典：正文里写 [[key:显示文字]]，RichText 会把它渲染成
// 带虚线下划线的可点击术语，点开是一段“小朋友也能懂”的解释。

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { t, type L, type Lang } from "@/lib/i18n";
import { STOPS } from "@/lib/stops";

// 术语条目。firstAt 是它第一次出现的那一站——verify.mjs 会检查
// 那一站的正文里确实有 [[key:…]] 标记，而且没有更早的一站抢先标了它。
// 词典跟不上课程是很容易发生的事：课在长，词典不会自己长。
export const glossary: Record<
  string,
  { word: L; def: L; firstAt: string }
> = {
  api: {
    firstAt: "/loop",
    word: { zh: "API", en: "API" },
    def: {
      zh: "别人搭好的“服务窗口”：你的程序把请求通过网络发过去，它把结果发回来。Claude API 就是一个“文字进、文字出”的窗口。",
      en: "A service counter run by someone else: your program sends a request over the internet, and a result comes back. The Claude API is a counter where text goes in and text comes out.",
    },
  },
  array: {
    firstAt: "/",
    word: { zh: "数组", en: "array" },
    def: {
      zh: "一排带编号的格子，可以一直往后追加新格子。写作 [ ]，比如 [\"苹果\", \"香蕉\"] 是两格。",
      en: "A row of numbered slots you can keep appending to. Written [ ], e.g. [\"apple\", \"banana\"] has two slots.",
    },
  },
  push: {
    firstAt: "/loop",
    word: { zh: "push", en: "push" },
    def: {
      zh: "往数组末尾加一格。messages.push(x) 就是把 x 放到最后一格。",
      en: "Append one slot to the end of an array. messages.push(x) puts x in the last slot.",
    },
  },
  object: {
    firstAt: "/loop",
    word: { zh: "对象", en: "object" },
    def: {
      zh: "带标签的小盒子：{ 标签: 内容 }。比如 { role: \"user\", content: \"你好\" } 有两个标签。",
      en: "A labeled box: { label: value }. For example { role: \"user\", content: \"hi\" } has two labels.",
    },
  },
  token: {
    firstAt: "/loop",
    word: { zh: "token", en: "token" },
    def: {
      zh: "模型计量文本长度的单位，大致相当于一个短词。发的内容越长 token 越多——越贵、也越慢。",
      en: "The unit a model uses to count text, roughly one token per short word. More text means more tokens, which costs more and takes longer.",
    },
  },
  stateless: {
    firstAt: "/loop",
    word: { zh: "无状态", en: "stateless" },
    def: {
      zh: "每次请求处理完就不保留任何状态。上一次调用的内容 API 一点都不留，所以每次都要把完整历史重新发一遍。",
      en: "No state is kept between requests. The API holds nothing from the previous call, so you resend the full history every time.",
    },
  },
  stopreason: {
    firstAt: "/loop",
    word: { zh: "stop_reason", en: "stop_reason" },
    def: {
      zh: "模型这一轮为什么停下来。tool_use 表示它在请求工具，该你的代码执行；end_turn 表示它说完了。循环靠这个字段决定要不要再转一圈。",
      en: "Why the model stopped this round. tool_use means it is asking for a tool and your code's turn has come; end_turn means it has finished. The loop decides whether to go round again by reading this field.",
    },
  },
  toolresult: {
    firstAt: "/loop",
    word: { zh: "tool_result", en: "tool_result" },
    def: {
      zh: "你执行完工具之后，把结果包成这样一条消息追加进数组。它的 role 是 user——凡是发给模型看的都是 user。",
      en: "After your code runs a tool, the output goes back into the array wrapped as one of these. Its role is user: everything shown to the model is user.",
    },
  },
  systemprompt: {
    firstAt: "/loop",
    word: { zh: "system 提示词", en: "system prompt" },
    def: {
      zh: "给模型的岗位说明：你是谁、能用什么工具、要守什么规矩。它是 create 调用的一个单独参数，不在 messages 数组里，但每一轮都随请求发出去，所以也每一轮计一次费。",
      en: "The model's job description: who it is, which tools it may use, which rules to follow. It is a separate parameter of the create call rather than an element of the messages array, and it goes out with every round, so it is billed every round.",
    },
  },
  sampling: {
    firstAt: "/chance",
    word: { zh: "采样", en: "sampling" },
    def: {
      zh: "模型算出的是「下一个 token 各有多大概率」的一张表，从表里挑一个出来的那一步就叫采样。它不是模型的一部分，是调用方的一段代码。",
      en: "The model produces a table of how likely each possible next token is; picking one out of that table is sampling. It is not part of the model but a piece of code on the calling side.",
    },
  },
  temperature: {
    firstAt: "/chance",
    word: { zh: "温度", en: "temperature" },
    def: {
      zh: "采样那一步的旋钮。温度低，概率最高的那个几乎总被选中；温度高，排在后面的选项也有机会。它不改变模型算出来的那张表，只改变挑的方式。",
      en: "The knob on the sampling step. Low and the most likely token is chosen nearly every time; high and the ones further down get a turn. It does not change the table the model produced, only how the pick is made.",
    },
  },
  contextwindow: {
    firstAt: "/context",
    word: { zh: "上下文窗口", en: "context window" },
    def: {
      zh: "模型一次能读进去多少 token 的硬上限。数组、system 提示词、工具说明书，加上留给这一轮回复的额度，全部要挤进同一个预算里。超了，请求会被直接拒绝。",
      en: "A hard ceiling on how many tokens a model can read in one request. The array, the system prompt, the tool list and the room reserved for this round's reply all share the budget. Go over it and the request is refused outright.",
    },
  },
  injection: {
    firstAt: "/trust",
    word: { zh: "提示注入", en: "prompt injection" },
    def: {
      zh: "外部内容里夹带的一段文字，试图指挥读到它的模型。它之所以难防，是因为数组里没有字段区分「我的指令」和「外面来的数据」——两者都是文字。",
      en: "A passage inside outside content that tries to direct the model reading it. It is hard to defend against because the array has no field separating your instructions from data that arrived from elsewhere: both are text.",
    },
  },
  backoff: {
    firstAt: "/again",
    word: { zh: "退避", en: "backoff" },
    def: {
      zh: "重试之间要等，而且越等越久。失败常常是因为对面过载，立刻重试只会加重过载；等待时间通常还会加一点随机抖动，免得所有客户端同时回来。",
      en: "Waiting between retries, and waiting longer each time. Failures are often caused by the far side being overloaded, and an immediate retry adds to it; the wait usually gets a little random jitter so that everyone does not come back at once.",
    },
  },
  idempotent: {
    firstAt: "/again",
    word: { zh: "幂等", en: "idempotent" },
    def: {
      zh: "做一次和做很多次，效果相同。搜索和读文件天然幂等，扣款和发信不是——后者要靠一个由发起方生成、重试时原样复用的键，让第二次调用什么也不做。",
      en: "Doing it many times has the same effect as doing it once. Searching and reading files are naturally idempotent; charging a card and sending mail are not, and those need a key generated by the caller and reused unchanged on retry so the second call does nothing.",
    },
  },
};

// 正文里认三种标记，别的都不认：
//   [[key:显示文字]]  可点击的术语
//   [[stop:/cost]]    指向另一站，序号由 lib/stops.ts 的顺序算出来
//   **强调**          加粗
// 交叉引用不写死数字，是因为它们一定会随着插入新站点而错位——
// 上一轮就错了十几处。verify.mjs 会检查每个 [[stop:…]] 都指向真实存在的站点。
const RE = /\[\[(\w+):([^\]]+)\]\]|\*\*([^*]+)\*\*/g;

export function RichText({ text, lang }: { text: string; lang: Lang }) {
  const parts: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(RE)) {
    const idx = m.index!;
    if (idx > last) parts.push(text.slice(last, idx));
    if (m[3] !== undefined) {
      parts.push(<strong key={k++}>{m[3]}</strong>);
    } else if (m[1] === "stop") {
      parts.push(<StopRef key={k++} href={m[2]} lang={lang} />);
    } else {
      parts.push(<Term key={k++} termKey={m[1]} display={m[2]} lang={lang} />);
    }
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// 「第 8 站」这样的引用。序号是算出来的，所以插一站进来不会让正文说谎。
export function stopNumber(href: string): number {
  return STOPS.findIndex((s) => s.href === href) + 1;
}

export function stopWord(href: string, lang: Lang): string {
  const n = stopNumber(href);
  if (n === 0) return href;
  return lang === "zh" ? `第 ${n} 站` : `stop ${n}`;
}

function StopRef({ href, lang }: { href: string; lang: Lang }) {
  const n = stopNumber(href);
  if (n === 0) return <>{href}</>;
  return (
    <a className="stop-ref" href={href}>
      {stopWord(href, lang)}
    </a>
  );
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
  // 弹窗坐标（相对视口，配合 position:fixed）；null 表示尚未测量、先隐藏避免闪跳。
  // place = 弹窗在术语的上/下方；caret = 小箭头相对弹窗左边的横向位置。
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    place: "top" | "bottom";
    caret: number;
  } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const entry = glossary[termKey];

  // 打开后测量并定位：优先放术语下方，空间不足则放上方；两轴都夹进视口。
  // 弹窗通过 portal 渲染到 body，因此不再被任何 overflow:hidden 容器裁切。
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const btn = btnRef.current;
    const pop = popRef.current;
    if (!btn || !pop) return;
    const b = btn.getBoundingClientRect();
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 10; // 留出箭头空间
    const m = 8; // 视口边距
    let place: "top" | "bottom" = "bottom";
    let top = b.bottom + gap;
    if (top + ph > vh - m && b.top - gap - ph > m) {
      top = b.top - gap - ph;
      place = "top";
    }
    top = Math.min(Math.max(top, m), Math.max(m, vh - ph - m));
    const center = b.left + b.width / 2;
    let left = center - pw / 2;
    left = Math.min(Math.max(left, m), Math.max(m, vw - pw - m));
    const caret = Math.min(Math.max(center - left, 16), Math.max(16, pw - 16));
    setPos({ top, left, place, caret });
  }, [open]);

  // 打开时：点击外部 / 滚动 / 改窗口大小 / Esc 都关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || popRef.current?.contains(target))
        return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!entry) return <>{display}</>;

  return (
    <span className="term-wrap">
      <button
        ref={btnRef}
        type="button"
        className={`term ${open ? "term-on" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {display}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            ref={popRef}
            className={`term-pop term-pop-fixed${pos ? ` term-pop-${pos.place}` : ""}`}
            role="tooltip"
            style={{
              top: pos ? pos.top : -9999,
              left: pos ? pos.left : -9999,
              visibility: pos ? "visible" : "hidden",
            }}
          >
            <b>{t(entry.word, lang)}</b>
            {t(entry.def, lang)}
            {pos && (
              <span
                className="term-pop-caret"
                style={{ left: pos.caret }}
                aria-hidden
              />
            )}
          </span>,
          document.body,
        )}
    </span>
  );
}
