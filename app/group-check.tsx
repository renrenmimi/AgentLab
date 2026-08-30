"use client";

// 每一组结尾的自我检验。
//
// 三条设计约束，都会被 verify.mjs 或 ?selftest=1 检查：
//   1. 不计分。没有分数、没有进度条、没有连续答对。
//   2. 答错要说清错在哪个念头上，所以纠错文案跟着选项走，而不是跟着题走。
//   3. 正确答案不能从标记里看出来——纠错文案在被选中之前不进 DOM，
//      选项顺序就是作者写的顺序，正确项在被选中之前没有任何多出来的属性。

import { useState } from "react";
import { checkFor, type Option, type Question } from "@/lib/checks";
import { ui, t, type Lang } from "@/lib/i18n";
import { RichText } from "@/lib/glossary";

type Answered = { chosen: string[]; solved: boolean };

export default function GroupCheck({ href, lang }: { href: string; lang: Lang }) {
  const check = checkFor(href);
  const [state, setState] = useState<Record<string, Answered>>({});
  if (!check) return null;

  const answer = (q: Question, option: Option) => {
    setState((prev) => {
      const cur = prev[q.id] ?? { chosen: [], solved: false };
      if (cur.solved || cur.chosen.includes(option.id)) return prev;
      return {
        ...prev,
        [q.id]: {
          chosen: [...cur.chosen, option.id],
          solved: cur.solved || !!option.correct,
        },
      };
    });
  };

  return (
    <section className="gc" aria-label={t(check.title, lang)}>
      <div className="gc-head">
        <span className="gc-tag">{t(ui.check.label, lang)}</span>
        <h2 className="lsn-h gc-title">{t(check.title, lang)}</h2>
      </div>
      <p className="lsn-p gc-intro">{t(check.intro, lang)}</p>
      <p className="lsn-note gc-note">{t(ui.check.noScore, lang)}</p>

      <ol className="gc-list">
        {check.questions.map((q) => {
          const cur = state[q.id] ?? { chosen: [], solved: false };
          return (
            <li key={q.id} className={`gc-q${cur.solved ? " gc-solved" : ""}`}>
              <fieldset className="gc-field">
                <legend className="gc-legend">
                  {q.setup && <span className="gc-setup">{t(q.setup, lang)}</span>}
                  <span className="gc-ask">{t(q.ask, lang)}</span>
                </legend>

                <div className="gc-options">
                  {q.options.map((o) => {
                    const picked = cur.chosen.includes(o.id);
                    // 没被选中的选项不带任何能泄露对错的东西。
                    const shown = picked
                      ? o.correct
                        ? " gc-right"
                        : " gc-wrong"
                      : "";
                    return (
                      <div key={o.id} className="gc-option">
                        <button
                          type="button"
                          className={`gc-choice${shown}`}
                          onClick={() => answer(q, o)}
                          disabled={cur.solved || picked}
                          aria-pressed={picked}
                        >
                          <span className="gc-mark" aria-hidden>
                            {picked ? (o.correct ? "✓" : "✕") : "·"}
                          </span>
                          <span className="gc-text">{t(o.text, lang)}</span>
                          {picked && (
                            <span className="gc-verdict">
                              {t(o.correct ? ui.check.right : ui.check.wrong, lang)}
                            </span>
                          )}
                        </button>
                        {picked && !o.correct && o.correction && (
                          <p className="gc-correction" role="status">
                            <RichText text={t(o.correction, lang)} lang={lang} />
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {cur.solved && (
                  <p className="gc-afterward" role="status">
                    <RichText text={t(q.afterward, lang)} lang={lang} />
                  </p>
                )}
                {!cur.solved && cur.chosen.length > 0 && (
                  <p className="gc-again">{t(ui.check.tryAgain, lang)}</p>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
