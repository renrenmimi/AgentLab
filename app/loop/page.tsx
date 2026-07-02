"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { steps, agentCode, type ChatItem } from "@/lib/scenario";
import { ui, useLang, t, type Lang } from "@/lib/i18n";
import { RichText } from "@/lib/glossary";

export default function LoopChapter() {
  const [cursor, setCursor] = useState(0);
  const [auto, setAuto] = useState(false);
  const { lang } = useLang();

  const atEnd = cursor >= steps.length - 1;
  const step = steps[cursor];
  const nextAction = atEnd ? null : steps[cursor + 1].action;
  const code = agentCode[lang];

  // 把第 0..cursor 步的增量数据累积成当前画面
  const state = useMemo(() => {
    const chat: ChatItem[] = [];
    const msgs: (typeof steps)[number]["msgs"] = [];
    let round = 0;
    let stopReason: string | null = null;
    let tokens = 0;
    for (let i = 0; i <= cursor; i++) {
      const s = steps[i];
      if (s.chat) chat.push(...s.chat);
      if (s.msgs) msgs!.push(...s.msgs);
      if (s.round !== undefined) round = s.round;
      if (s.stopReason !== undefined) stopReason = s.stopReason;
      if (s.tokens !== undefined) tokens = s.tokens;
    }
    return { chat, msgs: msgs!, round, stopReason, tokens };
  }, [cursor]);

  const arrayLen = state.msgs.filter((m) => !m.sys).length;
  const tokens = useCountUp(state.tokens);

  const advance = () => {
    setCursor((c) => Math.min(c + 1, steps.length - 1));
  };
  const back = () => {
    setCursor((c) => Math.max(c - 1, 0));
    setAuto(false);
  };
  const reset = () => {
    setCursor(0);
    setAuto(false);
  };

  // 自动播放：讲解比较长，给足阅读时间
  useEffect(() => {
    if (!auto) return;
    if (cursor >= steps.length - 1) {
      setAuto(false);
      return;
    }
    const t = setTimeout(
      () => setCursor((c) => Math.min(c + 1, steps.length - 1)),
      4000
    );
    return () => clearTimeout(t);
  }, [auto, cursor]);

  // 键盘：空格 / → 推进，← 回退
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA" || tag === "A")
        return;
      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, steps.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
        setAuto(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 当前步骤要点亮的代码行
  const isFocused = (line: number) =>
    step.focus.some(([a, b]) => line >= a && line <= b);

  let msgIndex = -1;

  return (
    <main className="page">
      <header className="header">
        <div>
          <h1 className="page-title">{t(ui.loop.title, lang)}</h1>
          <p className="subtitle">{t(ui.loop.subtitle, lang)}</p>
        </div>
        <div className="progress" aria-label="progress">
          {steps.map((s, i) => (
            <button
              key={i}
              className={`pdot ${i < cursor ? "done" : ""} ${
                i === cursor ? "cur" : ""
              }`}
              onClick={() => {
                setCursor(i);
                setAuto(false);
              }}
              title={`${i + 1}. ${t(s.title, lang)}`}
              aria-label={`${i + 1}. ${t(s.title, lang)}`}
            />
          ))}
        </div>
      </header>

      <section className="narration appear" key={`n-${cursor}-${lang}`}>
        <div className="n-head">
          <span className="n-step">
            STEP {cursor + 1}<i>/{steps.length}</i>
          </span>
          <h2>{t(step.title, lang)}</h2>
        </div>
        <p className="n-body">
          <RichText text={t(step.narration, lang)} lang={lang} />
        </p>
        {step.faq && (
          <details className="faq">
            <summary>
              <span className="faq-chick">🐣</span> {t(ui.loop.faqLabel, lang)}
              ：{t(step.faq.q, lang)}
            </summary>
            <p>
              <RichText text={t(step.faq.a, lang)} lang={lang} />
            </p>
          </details>
        )}
      </section>

      <div className="grid">
        <section className="panel" aria-label="chat">
          <div className="panel-title">
            <span className="tdot tdot-chat" />
            {t(ui.loop.chatTitle, lang)}
          </div>
          <div className="panel-body">
            {state.chat.length === 0 ? (
              <div className="empty">{t(ui.loop.empty, lang)}</div>
            ) : (
              state.chat.map((item, i) => (
                <ChatRow
                  key={i}
                  item={item}
                  lang={lang}
                  pending={
                    item.kind === "tool_call" && i === state.chat.length - 1
                  }
                />
              ))
            )}
          </div>
        </section>

        <section className="panel" aria-label="x-ray">
          <div className="panel-title">
            <span className="tdot tdot-xray" />
            {t(ui.loop.xrayTitle, lang)}
            <span className="len">length: {arrayLen}</span>
          </div>
          <div className="panel-body">
            {state.msgs.map((card, i) => {
              if (!card.sys) msgIndex++;
              return (
                <div
                  key={i}
                  className={`card appear ${
                    card.color === "purple"
                      ? "card-purple"
                      : card.color === "teal"
                        ? "card-teal"
                        : ""
                  } ${card.sys ? "card-sys" : ""}`}
                >
                  <div className="card-head">
                    <span className="card-idx">
                      {card.sys
                        ? t(ui.loop.sysIdx, lang)
                        : `messages[${msgIndex}]`}
                    </span>
                    <span className="card-tag">{card.tag}</span>
                  </div>
                  <div className={`card-body ${card.mono ? "mono" : ""}`}>
                    {t(card.body, lang)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="status">
            <span className="chip">
              {lang === "zh"
                ? `循环第 ${state.round} 轮`
                : `Loop round ${state.round}`}
            </span>
            <span
              className={`chip ${
                state.stopReason === "end_turn"
                  ? "chip-end"
                  : state.stopReason === "tool_use"
                    ? "chip-tool"
                    : ""
              }`}
            >
              stop_reason: {state.stopReason ?? "—"}
            </span>
            <span className="chip">
              ≈ {tokens.toLocaleString()} tokens
            </span>
          </div>
        </section>
      </div>

      <section className="code-panel" aria-label="code">
        <div className="panel-title">
          <span className="tdot tdot-code" />
          {t(ui.loop.codeTitle, lang)}
          <span className="len">agent.js · {t(ui.loop.lines, lang)}</span>
        </div>
        <div className="code-window">
          <div className="code-bar">
            <span className="wdot wdot-r" />
            <span className="wdot wdot-y" />
            <span className="wdot wdot-g" />
            <span className="code-file">agent.js</span>
          </div>
          <div className="code">
            {code.map((line, i) => (
              <div key={i} className={`cl ${isFocused(i + 1) ? "on" : ""}`}>
                <span className="ln">{i + 1}</span>
                <span className="ct">{tokenize(line)}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="code-note">{t(ui.loop.codeNote, lang)}</p>
      </section>

      <div className="controls">
        <button className="btn" onClick={reset} disabled={cursor === 0}>
          {t(ui.common.reset, lang)}
        </button>
        <button className="btn" onClick={back} disabled={cursor === 0}>
          ←
        </button>
        {nextAction ? (
          <button className="btn btn-primary" onClick={advance}>
            {t(nextAction, lang)}
          </button>
        ) : (
          <Link className="btn btn-primary" href="/build">
            {t(ui.loop.toBuild, lang)}
          </Link>
        )}
        <button
          className="btn"
          onClick={() => setAuto((a) => !a)}
          disabled={atEnd}
        >
          {auto ? t(ui.common.pause, lang) : t(ui.common.autoplay, lang)}
        </button>
        <span className="hint">
          <kbd>{t(ui.common.kbdSpace, lang)}</kbd> {t(ui.common.kbdNext, lang)}{" "}
          · <kbd>←</kbd> {t(ui.common.kbdPrev, lang)}
        </span>
      </div>
    </main>
  );
}

function ChatRow({
  item,
  pending,
  lang,
}: {
  item: ChatItem;
  pending: boolean;
  lang: Lang;
}) {
  switch (item.kind) {
    case "user":
      return <div className="bubble-user appear">{t(item.text, lang)}</div>;
    case "assistant":
      return (
        <div className="bubble-assistant appear">{t(item.text, lang)}</div>
      );
    case "tool_call":
      return (
        <div className="tool-chip appear">
          <div className="tool-chip-head">
            {t(ui.loop.toolReq, lang)}
            {pending && (
              <span className="tool-pending">{t(ui.loop.pending, lang)}</span>
            )}
          </div>
          <div className="tool-chip-code mono">
            {item.name}(&quot;{item.arg}&quot;)
          </div>
        </div>
      );
    case "tool_output":
      return <div className="tool-output appear">{item.text}</div>;
  }
}

// tokens 数字滚动动画
function useCountUp(target: number, ms = 700) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (from === target) return;
    let raf: number;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

// 极简语法高亮：注释 / 字符串 / 关键字，够用就好
const TOKEN_RE =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*")|\b(import|from|const|await|while|if|break|new|true)\b/g;

function tokenize(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of line.matchAll(TOKEN_RE)) {
    const idx = m.index!;
    if (idx > last) out.push(line.slice(last, idx));
    const cls = m[1] ? "tk-cmt" : m[2] ? "tk-str" : "tk-kw";
    out.push(
      <span key={k++} className={cls}>
        {m[0]}
      </span>
    );
    last = idx + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  if (out.length === 0) out.push(" ");
  return out;
}
