"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { scenarios, stateAt, type ChatItem, type Meter } from "@/lib/scenarios";
import { ui, useLang, t, type Lang } from "@/lib/i18n";
import { RichText } from "@/lib/glossary";

export default function LoopChapter() {
  const [pick, setPick] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [auto, setAuto] = useState(false);
  const { lang } = useLang();

  const scenario = scenarios[pick];
  const steps = scenario.steps;
  const code = scenario.code[lang];

  const atEnd = cursor >= steps.length - 1;
  const step = steps[cursor];
  const nextAction = atEnd ? null : steps[cursor + 1].action;

  // 面板状态由 lib/scenarios 里的纯函数算出来，verify.mjs 用的是同一个函数。
  const state = useMemo(() => stateAt(steps, cursor), [cursor, steps]);

  const arrayLen = state.msgs.filter((m) => !m.sys).length;
  const tokens = useCountUp(state.tokens);

  // 语法高亮只跟场景和语言有关。tokens 滚动动画每帧都会重渲染本组件，
  // 不缓存的话这些行会被重新 tokenize 几十次。
  const codeLines = useMemo(() => code.map((line) => tokenize(line)), [code]);

  const advance = () => setCursor((c) => Math.min(c + 1, steps.length - 1));
  const back = () => {
    setCursor((c) => Math.max(c - 1, 0));
    setAuto(false);
  };
  const reset = () => {
    setCursor(0);
    setAuto(false);
  };
  const choose = (i: number) => {
    setPick(i);
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
    // 注意：别用 `t` 当变量名，会遮蔽 i18n 的 t() 翻译函数
    const timer = setTimeout(
      () => setCursor((c) => Math.min(c + 1, steps.length - 1)),
      4500,
    );
    return () => clearTimeout(timer);
  }, [auto, cursor, steps.length]);

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
  }, [steps.length]);

  // 选择器用左右方向键在场景之间移动（tablist 的标准行为）
  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    e.stopPropagation();
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const next = (pick + delta + scenarios.length) % scenarios.length;
    choose(next);
    const el = document.getElementById(`scn-tab-${scenarios[next].id}`);
    el?.focus();
  };

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
        <div className="progress" aria-label={t(ui.a11y.progress, lang)}>
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

      <section className="scn" aria-label={t(ui.loop.pickerLabel, lang)}>
        <div className="scn-tabs" role="tablist" aria-label={t(ui.loop.pickerLabel, lang)}>
          {scenarios.map((s, i) => {
            const on = i === pick;
            return (
              <button
                key={s.id}
                id={`scn-tab-${s.id}`}
                role="tab"
                aria-selected={on}
                aria-controls="scn-body"
                tabIndex={on ? 0 : -1}
                className={`scn-tab${on ? " on" : ""} scn-${s.outcome}`}
                onClick={() => choose(i)}
                onKeyDown={onTabKey}
              >
                <span className="scn-tag">
                  {t(
                    s.outcome === "clean"
                      ? ui.loop.outcomeClean
                      : ui.loop.outcomeFault,
                    lang,
                  )}
                </span>
                <span className="scn-name">{t(s.name, lang)}</span>
              </button>
            );
          })}
        </div>
        <p className="scn-line" id="scn-body">
          {t(scenario.tagline, lang)}
        </p>
      </section>

      <section className="narration appear" key={`n-${scenario.id}-${cursor}-${lang}`}>
        <div className="n-head">
          <span className="n-step">
            STEP {cursor + 1}
            <i>/{steps.length}</i>
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
              {t(ui.loop.faqSep, lang)}
              {t(step.faq.q, lang)}
            </summary>
            <p>
              <RichText text={t(step.faq.a, lang)} lang={lang} />
            </p>
          </details>
        )}
      </section>

      <div className="grid">
        <section className="panel" aria-label={t(ui.a11y.chatPanel, lang)}>
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

        <section className="panel" aria-label={t(ui.a11y.xrayPanel, lang)}>
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
                  className={`card appear ${card.color ? `card-${card.color}` : ""} ${
                    card.sys ? "card-sys" : ""
                  }`}
                >
                  <div className="card-head">
                    <span className="card-idx">
                      {card.sys
                        ? t(ui.loop.sysIdx, lang)
                        : `messages[${msgIndex}]`}
                    </span>
                    <span className="card-tag">{card.tag}</span>
                    {card.weight && (
                      <span className="card-weight">{t(card.weight, lang)}</span>
                    )}
                  </div>
                  <div className={`card-body ${card.mono ? "mono" : ""}`}>
                    {t(card.body, lang)}
                  </div>
                </div>
              );
            })}
          </div>

          {state.meter && <MeterBar meter={state.meter} lang={lang} />}

          <div className="status">
            <span className="chip">
              {lang === "zh"
                ? `循环第 ${state.round} 轮`
                : `Loop round ${state.round}`}
            </span>
            <span className={`chip ${chipClass(state.stopReason, state.stopTone)}`}>
              stop_reason: {state.stopReason ?? "—"}
            </span>
            <span className="chip">≈ {tokens.toLocaleString()} tokens</span>
          </div>
        </section>
      </div>

      <section className="code-panel" aria-label={t(ui.a11y.codePanel, lang)}>
        <div className="panel-title">
          <span className="tdot tdot-code" />
          {t(ui.loop.codeTitle, lang)}
          <span className="len">
            agent.js · {code.length} {t(ui.loop.linesSuffix, lang)}
          </span>
        </div>
        <div className="code-window">
          <div className="code-bar">
            <span className="wdot wdot-r" />
            <span className="wdot wdot-y" />
            <span className="wdot wdot-g" />
            <span className="code-file">agent.js</span>
          </div>
          <div className="code">
            {codeLines.map((parts, i) => (
              <div key={i} className={`cl ${isFocused(i + 1) ? "on" : ""}`}>
                <span className="ln">{i + 1}</span>
                <span className="ct">{parts}</span>
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
          <kbd>{t(ui.common.kbdSpace, lang)}</kbd> {t(ui.common.kbdNext, lang)} ·{" "}
          <kbd>←</kbd> {t(ui.common.kbdPrev, lang)}
        </span>
      </div>
    </main>
  );
}

// 状态徽标的样式。场景没有明写语气时，按 stop_reason 的常规含义兜底，
// 这样顺利那次不用为每一步都标一遍。
function chipClass(
  stopReason: string | null,
  stopTone: "wait" | "done" | "bad" | null,
): string {
  const tone =
    stopTone ??
    (stopReason === "end_turn"
      ? "done"
      : stopReason === "tool_use"
        ? "wait"
        : null);
  if (tone === "done") return "chip-end";
  if (tone === "bad") return "chip-bad";
  if (tone === "wait") return "chip-tool";
  return "";
}

// 一根量表：用掉多少 / 上限多少。超出时除了变色，也把「已超出」写出来。
function MeterBar({ meter, lang }: { meter: Meter; lang: Lang }) {
  const over = meter.used > meter.limit;
  const pct = Math.max(
    meter.used > 0 ? 2 : 0,
    Math.min(100, (meter.used / meter.limit) * 100),
  );
  const unit = meter.unit ? ` ${t(meter.unit, lang)}` : "";
  return (
    <div className={`meter${over ? " meter-over" : ""}`}>
      <div className="meter-head">
        <span>{t(meter.label, lang)}</span>
        <span className="meter-num">
          {meter.used.toLocaleString()} / {meter.limit.toLocaleString()}
          {unit}
          {over && <b> · {t(ui.loop.meterOver, lang)}</b>}
        </span>
      </div>
      <div
        className="meter-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={meter.limit}
        aria-valuenow={Math.min(meter.used, meter.limit)}
        aria-label={t(meter.label, lang)}
      >
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
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
      return <div className="bubble-assistant appear">{t(item.text, lang)}</div>;
    case "aside":
      return (
        <div className="bubble-aside appear">
          <span className="bubble-aside-tag">{t(ui.loop.asideLabel, lang)}</span>
          {t(item.text, lang)}
        </div>
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
    case "tool_error":
      return (
        <div className="tool-output tool-output-err appear">
          <span className="tool-out-tag">{t(ui.loop.toolFailed, lang)}</span>
          {item.text}
        </div>
      );
    case "tool_output":
      return (
        <div className="tool-output appear">
          {item.text === "" ? " " : item.text}
        </div>
      );
  }
}

// tokens 数字滚动动画
// 从「屏幕上当前显示的数字」起算（而不是上一个目标值），
// 这样连点时不会从中途跳回上一个目标再滚动。
function useCountUp(target: number, ms = 700) {
  const [val, setVal] = useState(target);
  const shown = useRef(target);
  useEffect(() => {
    const from = shown.current;
    if (from === target) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (target - from) * eased);
      shown.current = next;
      setVal(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

// 极简语法高亮：注释 / 字符串 / 关键字，够用就好
const TOKEN_RE =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*")|\b(import|from|const|let|await|while|for|if|break|return|async|function|new|true)\b/g;

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
      </span>,
    );
    last = idx + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  if (out.length === 0) out.push(" ");
  return out;
}
