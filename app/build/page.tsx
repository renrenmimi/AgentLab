"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { codeTemplate, blanks, runScript } from "@/lib/build";
import { ui, useLang, t, type Lang } from "@/lib/i18n";
import { RichText } from "@/lib/glossary";

type Phase = "write" | "ready" | "running" | "done";

export default function BuildChapter() {
  const [solved, setSolved] = useState(0); // 已填对的空数
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<{
    kind: "idle" | "wrong" | "right" | "hint";
    msg: string;
  }>({ kind: "idle", msg: "" });
  const [attempts, setAttempts] = useState(0);
  const [phase, setPhase] = useState<Phase>("write");
  const [runCount, setRunCount] = useState(0); // 已显示的运行输出行数
  const inputRef = useRef<HTMLInputElement>(null);
  const { lang } = useLang();

  const template = codeTemplate[lang];
  const script = runScript[lang];
  const current = solved < blanks.length ? blanks[solved] : null;

  // 换空时清空输入并聚焦
  useEffect(() => {
    setValue("");
    setAttempts(0);
    inputRef.current?.focus();
  }, [solved]);

  // 全部填完 → 进入待运行状态
  useEffect(() => {
    if (solved >= blanks.length && phase === "write") setPhase("ready");
  }, [solved, phase]);

  // 运行动画：逐行吐出控制台输出
  useEffect(() => {
    if (phase !== "running") return;
    if (runCount >= script.length) {
      setPhase("done");
      return;
    }
    const timer = setTimeout(() => setRunCount((n) => n + 1), 650);
    return () => clearTimeout(timer);
  }, [phase, runCount, script.length]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!current) return;
    const got = normalize(value);
    if (got === "") return;

    if (current.answers.map(normalize).includes(got)) {
      setFeedback({ kind: "right", msg: t(current.explain, lang) });
      setTimeout(() => {
        setSolved((s) => s + 1);
        setFeedback({ kind: "idle", msg: "" });
      }, 1400);
      return;
    }

    setAttempts((n) => n + 1);
    const targeted = current.wrong?.find((w) => w.test.test(got));
    const fallback =
      lang === "zh"
        ? `不太对。${t(current.hint, lang)}`
        : `Not quite. ${t(current.hint, lang)}`;
    setFeedback({
      kind: "wrong",
      msg: targeted ? t(targeted.hint, lang) : fallback,
    });
    inputRef.current?.select();
  };

  const showHint = () => {
    if (!current) return;
    setFeedback({ kind: "hint", msg: t(current.hint, lang) });
    inputRef.current?.focus();
  };

  const reveal = () => {
    if (!current) return;
    setFeedback({
      kind: "right",
      msg: `${t(ui.build.answerIs, lang)} ${current.display}. ${t(current.explain, lang)}`,
    });
    setTimeout(() => {
      setSolved((s) => s + 1);
      setFeedback({ kind: "idle", msg: "" });
    }, 1800);
  };

  const restart = () => {
    setSolved(0);
    setValue("");
    setFeedback({ kind: "idle", msg: "" });
    setAttempts(0);
    setPhase("write");
    setRunCount(0);
  };

  // 找到当前空所在的行（用于点亮）
  const activeLine = template.findIndex((l) => l.includes(`{{${solved}}}`));

  const blankLabel =
    lang === "zh" ? `第 ${solved + 1} 空` : `Blank ${solved + 1}`;

  return (
    <main className="page">
      <header className="header">
        <div>
          <h1 className="page-title">{t(ui.build.title, lang)}</h1>
          <p className="subtitle">{t(ui.build.subtitle, lang)}</p>
        </div>
        <div className="progress" aria-label="progress">
          {blanks.map((b, i) => (
            <span
              key={i}
              className={`pdot ${i < solved ? "done" : ""} ${
                i === solved && phase === "write" ? "cur" : ""
              }`}
              title={lang === "zh" ? `第 ${i + 1} 空` : `Blank ${i + 1}`}
            />
          ))}
        </div>
      </header>

      {phase === "write" && current && (
        <section className="narration appear" key={`q-${solved}-${lang}`}>
          <div className="n-head">
            <span className="n-step">
              {blankLabel}
              <i>/{blanks.length}</i>
            </span>
            <h2>{t(current.q, lang)}</h2>
          </div>
          {current.lesson && (
            <div className="q-lesson">
              <span className="q-lesson-icon">🎒</span>
              <span>
                <b>{t(ui.build.lessonLabel, lang)}</b>
                <RichText text={t(current.lesson, lang)} lang={lang} />
              </span>
            </div>
          )}
          <form className="q-form" onSubmit={submit}>
            <input
              ref={inputRef}
              className={`q-input mono ${feedback.kind === "wrong" ? "q-shake" : ""}`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t(current.placeholder, lang)}
              autoComplete="off"
              spellCheck={false}
              aria-label="answer"
            />
            <button type="submit" className="btn btn-primary">
              {t(ui.build.submit, lang)}
            </button>
            <button type="button" className="btn" onClick={showHint}>
              {t(ui.build.hint, lang)}
            </button>
            {attempts >= 3 && (
              <button type="button" className="btn" onClick={reveal}>
                {t(ui.build.reveal, lang)}
              </button>
            )}
          </form>
          {feedback.msg && (
            <p className={`q-feedback q-${feedback.kind}`} key={feedback.msg}>
              {feedback.kind === "right"
                ? "✓ "
                : feedback.kind === "wrong"
                  ? "✗ "
                  : "💡 "}
              {feedback.msg}
            </p>
          )}
        </section>
      )}

      {phase === "ready" && (
        <section className="narration appear">
          <div className="n-head">
            <span className="n-step">8/8 ✓</span>
            <h2>{t(ui.build.readyTitle, lang)}</h2>
          </div>
          <p className="n-body">{t(ui.build.readyBody, lang)}</p>
          <div className="q-form">
            <button
              className="btn btn-primary"
              onClick={() => setPhase("running")}
            >
              {t(ui.build.runBtn, lang)}
            </button>
          </div>
        </section>
      )}

      {(phase === "running" || phase === "done") && (
        <section className="code-window run-window appear" aria-label="output">
          <div className="code-bar">
            <span className="wdot wdot-r" />
            <span className="wdot wdot-y" />
            <span className="wdot wdot-g" />
            <span className="code-file">
              {lang === "zh" ? "终端" : "terminal"}
            </span>
          </div>
          <div className="run-term">
            {script.slice(0, runCount).map((line, i) => (
              <div key={i} className="run-line appear mono">
                {line}
              </div>
            ))}
            {phase === "running" && <span className="run-cursor" />}
          </div>
        </section>
      )}

      {phase === "done" && (
        <section className="win-card appear">
          <Confetti />
          <h2>{t(ui.build.doneTitle, lang)}</h2>
          {lang === "zh" ? (
            <p>
              回顾一下你亲手填的三个核心：记忆是一个<b>数组</b>（[ ] 和两次
              role: &quot;user&quot;）、节奏是一个<b>循环</b>（while (true) 和
              break）、每一轮都把<b>整个 messages</b> 全量重发。 这就是 Claude
              Code 们的内核，剩下的只是工具更多、循环更讲究。
            </p>
          ) : (
            <p>
              Recap of what you typed: the memory is an <b>array</b> ([ ] plus
              role: &quot;user&quot; twice), the rhythm is a <b>loop</b> (while
              (true) plus break), and every round resends the{" "}
              <b>entire messages</b> array. That is the core of Claude Code and
              friends — the rest is just more tools and a fancier loop.
            </p>
          )}
          <div className="q-form">
            <button className="btn" onClick={restart}>
              {t(ui.build.again, lang)}
            </button>
            <Link className="btn" href="/loop">
              {t(ui.build.backLoop, lang)}
            </Link>
            <Link className="btn btn-primary" href="/">
              {t(ui.build.backIntro, lang)}
            </Link>
          </div>
        </section>
      )}

      <section className="code-panel" aria-label="your agent code">
        <div className="panel-title">
          <span className="tdot tdot-code" />
          {t(ui.build.codeTitle, lang)}
          <span className="len">
            {lang === "zh"
              ? `已完成 ${solved}/${blanks.length} 个空`
              : `${solved}/${blanks.length} blanks filled`}
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
            {template.map((line, i) => (
              <div
                key={i}
                className={`cl ${i === activeLine && phase === "write" ? "on" : ""}`}
              >
                <span className="ln">{i + 1}</span>
                <span className="ct">
                  {renderLine(line, solved, phase, value, lang)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="code-note">{t(ui.build.codeNote, lang)}</p>
      </section>
    </main>
  );
}

// 把模板行渲染成：已填的空（绿色）/ 当前空（实时镜像输入）/ 未到的空（____）
function renderLine(
  line: string,
  solved: number,
  phase: Phase,
  typing: string,
  lang: Lang
): ReactNode[] {
  const parts = line.split(/(\{\{\d+\}\})/);
  const out: ReactNode[] = [];
  parts.forEach((p, i) => {
    const m = p.match(/^\{\{(\d+)\}\}$/);
    if (!m) {
      out.push(<span key={i}>{tokenize(p)}</span>);
      return;
    }
    const idx = Number(m[1]);
    if (idx < solved) {
      out.push(
        <span key={i} className="blank-done">
          {blanks[idx].display}
        </span>
      );
    } else if (idx === solved && phase === "write") {
      out.push(
        <span key={i} className="blank-live">
          {typing || t(blanks[idx].placeholder, lang)}
        </span>
      );
    } else {
      out.push(
        <span key={i} className="blank-hole">
          ____
        </span>
      );
    }
  });
  return out;
}

// 宽松归一化：全角转半角、去空白、单引号转双引号、去掉尾部分号逗号，再转小写
const FULL = "（）｛｝［］＂＇；，．！＝＜＞";
const HALF = "(){}[]\"';,.!=<>";

function normalize(s: string): string {
  let out = s.trim();
  for (let i = 0; i < FULL.length; i++) out = out.split(FULL[i]).join(HALF[i]);
  out = out.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  out = out.replace(/\s+/g, "");
  out = out.replace(/[;,]+$/, "");
  out = out.replace(/'/g, '"');
  return out.toLowerCase();
}

// 与 /loop 一致的极简语法高亮
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

// 简易彩带：固定参数，避免随机数导致水合不一致
const CONFETTI = [
  { l: 6, d: 0, c: "#8b7cf7" },
  { l: 14, d: 0.4, c: "#34c39a" },
  { l: 24, d: 0.1, c: "#f5cf7a" },
  { l: 33, d: 0.6, c: "#8b7cf7" },
  { l: 42, d: 0.25, c: "#f08fb7" },
  { l: 51, d: 0.5, c: "#34c39a" },
  { l: 60, d: 0.05, c: "#f5cf7a" },
  { l: 69, d: 0.45, c: "#8b7cf7" },
  { l: 78, d: 0.2, c: "#f08fb7" },
  { l: 87, d: 0.55, c: "#34c39a" },
  { l: 94, d: 0.35, c: "#f5cf7a" },
];

function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {CONFETTI.map((c, i) => (
        <i
          key={i}
          style={{
            left: `${c.l}%`,
            animationDelay: `${c.d}s`,
            background: c.c,
          }}
        />
      ))}
    </div>
  );
}
