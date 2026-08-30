"use client";

import { useState } from "react";
import {
  TEMPS,
  bench,
  blocks,
  distribution,
  meta,
  outcomes,
  sample,
  type Outcome,
} from "@/lib/chance";
import { useLang, t } from "@/lib/i18n";
import {
  LessonHeader,
  Prose,
  SimulatedNote,
  StopNav,
  Takeaway,
  Workbench,
} from "@/app/lesson";

export default function ChanceStop() {
  const { lang } = useLang();
  const [temp, setTemp] = useState(0.7);
  const [seed, setSeed] = useState(1);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [last, setLast] = useState<Outcome | null>(null);

  const run = (times: number) => {
    let s = seed;
    const next = { ...tally };
    let latest: Outcome | null = last;
    for (let i = 0; i < times; i++) {
      latest = sample(temp, s++);
      next[latest.id] = (next[latest.id] ?? 0) + 1;
    }
    setSeed(s);
    setTally(next);
    setLast(latest);
  };

  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  const probs = distribution(temp);

  const kindLabel = (k: Outcome["kind"]) =>
    k === "good" ? bench.kindGood : k === "slower" ? bench.kindSlower : bench.kindWrong;

  return (
    <main className="page">
      <LessonHeader meta={meta} lang={lang} />
      <SimulatedNote lang={lang} />

      <Workbench title={bench.title} note={bench.note} lang={lang}>
        <p className="lsn-note">{t(bench.task, lang)}</p>

        <div className="lsn-slider">
          <label htmlFor="temp">{t(bench.tempLabel, lang)}</label>
          <input
            id="temp"
            type="range"
            min={0}
            max={TEMPS.length - 1}
            step={1}
            value={TEMPS.indexOf(temp as (typeof TEMPS)[number])}
            onChange={(e) => {
              setTemp(TEMPS[Number(e.target.value)]);
              setTally({});
              setLast(null);
            }}
          />
          <span className="lsn-slider-v">{temp.toFixed(1)}</span>
        </div>
        <p className="lsn-note">{t(bench.tempNote, lang)}</p>

        <div className="q-form">
          <button className="btn btn-primary" onClick={() => run(1)}>
            {t(bench.again, lang)}
          </button>
          <button className="btn" onClick={() => run(10)}>
            {t(bench.tenMore, lang)}
          </button>
          <button
            className="btn"
            onClick={() => {
              setTally({});
              setLast(null);
            }}
            disabled={total === 0}
          >
            {t(bench.clear, lang)}
          </button>
          <span className="hint">
            {t(bench.runs, lang)}: <b className="ch-count">{total}</b>
          </span>
        </div>

        {last && (
          <div className={`lsn-col ch-last ch-${last.kind}`}>
            <div className="lsn-col-h">
              {t(bench.thisRun, lang)} — {t(kindLabel(last.kind), lang)}
            </div>
            <p className="lsn-quote">{t(last.move, lang)}</p>
            <p className="lsn-note">{t(last.result, lang)}</p>
          </div>
        )}

        <div>
          <div className="lsn-col-h ch-head">{t(bench.tally, lang)}</div>
          <ul className="ch-bars">
            {outcomes.map((o, i) => {
              const n = tally[o.id] ?? 0;
              const share = total > 0 ? n / total : 0;
              return (
                <li key={o.id} className={`ch-bar ch-${o.kind}`}>
                  <span className="ch-bar-label">
                    <span className="ch-move mono">{t(o.move, lang)}</span>
                    <span className="ch-kind">{t(kindLabel(o.kind), lang)}</span>
                  </span>
                  <span className="ch-track">
                    <span
                      className="ch-fill"
                      style={{ width: `${Math.round(share * 100)}%` }}
                    />
                  </span>
                  <span className="ch-num num">
                    {n} <i>({Math.round(probs[i] * 100)}%)</i>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Workbench>

      {blocks.map((b, i) => (
        <Prose key={i} block={b} lang={lang} />
      ))}

      <Takeaway text={meta.takeaway} lang={lang} />
      <StopNav lang={lang} />
    </main>
  );
}
