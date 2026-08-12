"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { scenes, stage } from "@/lib/intro";
import { ui, useLang, t, type Lang } from "@/lib/i18n";
import { RichText } from "@/lib/glossary";

export default function IntroPage() {
  const [cursor, setCursor] = useState(0);
  const [auto, setAuto] = useState(false);
  const { lang } = useLang();

  const atEnd = cursor >= scenes.length - 1;
  const scene = scenes[cursor];
  const nextAction = atEnd ? null : scenes[cursor + 1].action;

  useEffect(() => {
    if (!auto) return;
    if (cursor >= scenes.length - 1) {
      setAuto(false);
      return;
    }
    // 注意：别用 `t` 当变量名，会遮蔽 i18n 的 t() 翻译函数
    const timer = setTimeout(
      () => setCursor((c) => Math.min(c + 1, scenes.length - 1)),
      7000
    );
    return () => clearTimeout(timer);
  }, [auto, cursor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA" || tag === "A")
        return;
      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, scenes.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
        setAuto(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sceneLabel =
    lang === "zh" ? `第 ${cursor + 1} 幕` : `Scene ${cursor + 1}`;

  return (
    <main className="page">
      <header className="header">
        <div>
          <h1 className="page-title">{t(ui.intro.title, lang)}</h1>
          <p className="subtitle">{t(ui.intro.subtitle, lang)}</p>
        </div>
        <div className="progress" aria-label="progress">
          {scenes.map((s, i) => (
            <button
              key={i}
              className={`pdot ${i < cursor ? "done" : ""} ${i === cursor ? "cur" : ""}`}
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
            {sceneLabel}
            <i>/{scenes.length}</i>
          </span>
          <h2>{t(scene.title, lang)}</h2>
        </div>
        <p className="n-body">
          <RichText text={t(scene.text, lang)} lang={lang} />
        </p>
      </section>

      <section className="stage-panel appear" key={`s-${cursor}-${lang}`}>
        <SceneVisual id={cursor} lang={lang} />
      </section>

      <div className="controls">
        <button
          className="btn"
          onClick={() => {
            setCursor((c) => Math.max(c - 1, 0));
            setAuto(false);
          }}
          disabled={cursor === 0}
        >
          ←
        </button>
        {nextAction ? (
          <button
            className="btn btn-primary"
            onClick={() => setCursor((c) => Math.min(c + 1, scenes.length - 1))}
          >
            {t(nextAction, lang)}
          </button>
        ) : (
          <Link className="btn btn-primary" href="/loop">
            {t(ui.intro.toLoop, lang)}
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
          <kbd>{t(ui.common.kbdSpace, lang)}</kbd> {t(ui.intro.kbdNext, lang)} ·{" "}
          <kbd>←</kbd> {t(ui.intro.kbdPrev, lang)}
        </span>
      </div>
    </main>
  );
}

function SceneVisual({ id, lang }: { id: number; lang: Lang }) {
  switch (id) {
    // 第 1 幕：print("hello world") —— 从学习者唯一会的那行代码出发
    case 0:
      return (
        <div className="stage">
          <div className="code-window sc-term">
            <div className="code-bar">
              <span className="wdot wdot-r" />
              <span className="wdot wdot-y" />
              <span className="wdot wdot-g" />
              <span className="code-file">hello.py</span>
            </div>
            <div className="sc-type-area">
              <div className="sc-typed">print(&quot;hello world&quot;)</div>
              <div className="sc-typed-out">hello world</div>
            </div>
          </div>
          <div className="sc-caption">{t(stage.s0cap, lang)}</div>
        </div>
      );

    // 第 2 幕：文字进 → 文字出
    case 1:
      return (
        <div className="stage">
          <div className="sc-row">
            <div className="sc-bubble sc-in">{t(stage.s1q, lang)}</div>
            <div className="sc-brain">
              <span className="sc-brain-emoji">🧠</span>
              <span className="sc-brain-label">{t(stage.brain, lang)}</span>
            </div>
            <div className="sc-bubble sc-out">{t(stage.s1a, lang)}</div>
          </div>
          <div className="sc-caption">{t(stage.s1cap, lang)}</div>
        </div>
      );

    // 第 3 幕：它没有手
    case 2:
      return (
        <div className="stage">
          <div className="sc-row">
            <div className="sc-bubble sc-in">{t(stage.s2q, lang)}</div>
            <div className="sc-brain sc-shake">
              <span className="sc-brain-emoji">🧠</span>
              <span className="sc-brain-label">{t(stage.brain, lang)}</span>
            </div>
            <div className="sc-bubble sc-out sc-sad">{t(stage.s2a, lang)}</div>
          </div>
          <div className="sc-locks">
            <span>
              📁<i>🔒</i>
            </span>
            <span>
              🌐<i>🔒</i>
            </span>
            <span>
              ⌨️<i>🔒</i>
            </span>
          </div>
          <div className="sc-caption">{t(stage.s2cap, lang)}</div>
        </div>
      );

    // 第 4 幕：工具 = 手（请求飞过去，结果飞回来，无限循环）
    case 3:
      return (
        <div className="stage">
          <div className="sc-row sc-duo">
            <div className="sc-actor">
              <span>🧠</span>
              {t(stage.actor1, lang)}
              <small>{t(stage.actor1sub, lang)}</small>
            </div>
            <div className="sc-lane">
              <div className="sc-fly sc-req mono">
                read_file(&quot;package.json&quot;)
              </div>
              <div className="sc-fly sc-res mono">
                {'{ "name": "agentlab", … }'}
              </div>
            </div>
            <div className="sc-actor">
              <span>🛠️</span>
              {t(stage.actor2, lang)}
              <small>{t(stage.actor2sub, lang)}</small>
            </div>
          </div>
          <div className="sc-caption">{t(stage.s3cap, lang)}</div>
        </div>
      );

    // 第 5 幕：循环
    case 4:
      return (
        <div className="stage">
          <div className="loop-wrap">
            <div className="loop-node ln1">{t(stage.n1, lang)}</div>
            <div className="loop-node ln2">{t(stage.n2, lang)}</div>
            <div className="loop-node ln3">{t(stage.n3, lang)}</div>
            <div className="loop-node ln4">{t(stage.n4, lang)}</div>
            <div className="loop-dot" />
            <div className="loop-exit">{t(stage.exit, lang)}</div>
          </div>
        </div>
      );

    // 第 6 幕：公式
    default:
      return (
        <div className="stage">
          <div className="formula">
            <span className="f-piece f-arr mono">{t(stage.arr, lang)}</span>
            <span className="f-op">+</span>
            <span className="f-piece f-loop">
              <i>↻</i> {t(stage.loopWord, lang)}
            </span>
            <span className="f-op">=</span>
            <span className="f-piece f-agent">Agent</span>
          </div>
          <div className="sc-caption">{t(stage.s5cap, lang)}</div>
        </div>
      );
  }
}
